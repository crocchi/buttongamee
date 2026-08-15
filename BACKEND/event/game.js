const { saveScore, getTopScores, updateScoreNickname } = require('../db/scoreModel');
const { createBoard, makeMove, levelDefinition } = require('../game/match3Engine');
const { createSudoku, isComplete } = require('../game/sudokuEngine');

// giocatori in attesa di un avversario per la modalità 1vs1
const waitingQueue = [];
const pairsWaitingQueue = [];

// livello massimo della campagna: oltre questo la partita finisce davvero
const MAX_LEVEL = 100;

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Ogni livello aggiunge esattamente cinque tessere: 5, 10, 15 ... fino a 500.
function numButtonsForLevel(liv) {
    return Math.min(MAX_LEVEL, Math.max(1, Number(liv) || 1)) * 5;
}

function levelConfig(liv) {
    const level = Math.min(MAX_LEVEL, Math.max(1, Number(liv) || 1));
    const world = Math.ceil(level / 10);
    const boss = level % 10 === 0;
    return {
        level,
        world,
        boss,
        numButtons: numButtonsForLevel(level),
        previewMs: world === 2
            ? 15000 - (level - 11) * 1000
            : (world >= 9 || boss ? 1200 : (world >= 3 ? 2200 : 0)),
        hidden: world >= 2,
        exposedCount: world === 2 ? 2 : 0,
        penaltyMs: world >= 3 ? (world >= 9 ? 5000 : 3000) : 0,
        combo: world >= 4,
        lockedCount: world >= 5 ? 2 : 0,
        shuffleOnMismatch: world >= 6,
        matchRule: world >= 7 ? 'sum10' : 'equal',
        noColor: world >= 8,
        selectionMs: Math.max(1000, 4000 - (level - 1) * 30),
        maxSelections: 4,
        // Il tempo totale cresce con la quantità di tessere; il timer della singola
        // selezione, invece, diventa progressivamente più rapido.
        targetMs: Math.max(60000, numButtonsForLevel(level) * 1600),
    };
}

// genera coppie di numeri uguali (es. num=20 -> 10 coppie, 20 bottoni)
// se ci sono abbastanza coppie, due di esse diventano i bonus speciali del gioco originale:
// 'point' (Atom the Point: punti extra) e 'bomb' (Atom the Bomb: distrugge un'altra coppia a caso)
function generatePuzzle(numButtons, matchRule = 'equal') {
    const count = Math.max(2, Math.floor(Number(numButtons) || 20));
    const pairs = Math.floor(count / 2);
    const values = [];
    for (let v = 1; v <= pairs; v++) {
        if (matchRule === 'sum10') {
            const first = ((v - 1) % 9) + 1;
            values.push(first, 10 - first);
        } else {
            values.push(v, v);
        }
    }
    if (pairs >= 4) {
        values[0] = 'point'; values[1] = 'point';
        values[2] = 'bomb'; values[3] = 'bomb';
    }
    // Nei livelli con un numero dispari di tessere rimane volutamente un numero
    // senza coppia: non impedisce il completamento del livello.
    if (count % 2) values.push(1000 + count);
    return shuffle(values);
}

// Campagna: usa gruppi completi da 2 o 3 tessere, senza numeri fittizi.
// Esempio livello 1 (5 tessere): 1,1,1 + 2,2.
function generateCampaignPuzzle(numButtons, matchRule = 'equal') {
    const count = Math.max(2, Math.floor(Number(numButtons) || 5));
    const tripleCount = matchRule === 'sum10'
        ? (count % 2 ? 1 : 0)
        : (count % 2 ? 1 : (count >= 6 ? 2 : 0));
    const pairCount = (count - tripleCount * 3) / 2;
    const groups = [];
    let nextValue = 1;

    for (let i = 0; i < tripleCount; i++) {
        const value = matchRule === 'sum10' ? 5 : nextValue++;
        groups.push([value, value, value]);
    }
    for (let i = 0; i < pairCount; i++) {
        if (matchRule === 'sum10') {
            const first = (i % 4) + 1;
            groups.push([first, 10 - first]);
        } else {
            const value = nextValue++;
            groups.push([value, value]);
        }
    }

    const pairGroups = groups.filter(group => group.length === 2);
    if (pairGroups.length >= 4) {
        pairGroups[0].fill('point');
        pairGroups[1].fill('bomb');
    }
    return shuffle(groups.flat());
}

function valuesMatch(first, second, rule) {
    if (first === 'point' || first === 'bomb') return first === second;
    return rule === 'sum10' ? Number(first) + Number(second) === 10 : first === second;
}

function hasRemainingMatch(puzzle, matched, rule) {
    const counts = new Map();
    puzzle.forEach((value, index) => {
        if (!matched.has(index)) counts.set(value, (counts.get(value) || 0) + 1);
    });
    for (const [value, count] of counts) {
        if (value === 'point' || value === 'bomb') {
            if (count >= 2) return true;
        } else if (rule === 'sum10') {
            const complement = 10 - Number(value);
            if (complement === Number(value) ? count >= 2 : counts.has(complement)) return true;
        } else if (count >= 2) {
            return true;
        }
    }
    return false;
}

function requiredGroupSize(game, index) {
    const value = game.puzzle[index];
    if (value === 'point' || value === 'bomb' || game.config.matchRule === 'equal') {
        return game.puzzle.reduce((count, tile, tileIndex) =>
            count + (!game.matched.has(tileIndex) && tile === value ? 1 : 0), 0
        );
    }
    if (Number(value) === 5) {
        const fives = game.puzzle.reduce((count, tile, tileIndex) =>
            count + (!game.matched.has(tileIndex) && Number(tile) === 5 ? 1 : 0), 0
        );
        return fives >= 3 ? 3 : 2;
    }
    return 2;
}

function lockedIndicesForPuzzle(puzzle, count) {
    return puzzle
        .map((value, index) => ({ value, index }))
        .filter(({ value }) => value !== 'point' && value !== 'bomb')
        .slice(0, count)
        .map(({ index }) => index);
}

function normalizeNickname(value) {
    const nickname = String(value || '').trim().replace(/\s+/g, ' ');
    return /^[\p{L}\p{N}_ -]{2,24}$/u.test(nickname) ? nickname : null;
}

module.exports = (io, main) => {

    const clearSelectionTimers = function (game) {
        if (!game || !game.selections) return;
        for (const timer of game.selections.values()) clearTimeout(timer);
        game.selections.clear();
    };

    const clearSelectedIndices = function (game, indices) {
        if (!game || !game.selections) return;
        indices.forEach(index => {
            const timer = game.selections.get(index);
            if (timer) clearTimeout(timer);
            game.selections.delete(index);
        });
    };

    const clearCampaignDeadline = function (game) {
        if (game && game.deadlineTimer) {
            clearTimeout(game.deadlineTimer);
            game.deadlineTimer = null;
        }
    };

    const finishCampaignLoss = async function (socket, game) {
        if (!game || game.finishing || socket.data.game !== game) return;
        game.finishing = true;
        clearCampaignDeadline(game);
        clearSelectionTimers(game);

        const score = (game.totalScore || 0) + (game.levelScore || 0);
        const elapsedMs = Date.now() - game.campaignStartTime + game.totalPenaltyMs;
        let scoreId = null;
        try {
            scoreId = await saveScore({
                nickname: socket.data.username,
                mode: 'campaign-total',
                score,
                elapsedMs,
                level: game.liv || 1,
            });
        } catch (e) {
            console.error('Errore salvataggio sconfitta:', e.message);
        }

        if (scoreId) {
            if (!socket.data.renameableScoreIds) socket.data.renameableScoreIds = new Set();
            socket.data.renameableScoreIds.add(scoreId);
        }
        socket.data.game = null;
        socket.emit('campaignLost', { score, elapsedMs, liv: game.liv || 1 });
    };

    const setCampaignDeadline = function (socket, game) {
        clearCampaignDeadline(game);
        const elapsedLevelMs = Date.now() - game.startTime + game.levelPenaltyMs;
        const remainingMs = Math.max(0, game.config.targetMs - elapsedLevelMs);
        game.deadlineTimer = setTimeout(() => void finishCampaignLoss(socket, game), remainingMs);
        if (typeof game.deadlineTimer.unref === 'function') game.deadlineTimer.unref();
    };

    const gameStart = function (liv) {
        const socket = this;
        clearCampaignDeadline(socket.data.game);
        clearSelectionTimers(socket.data.game);
        removeFromWaitingQueue(socket);
        const definition = levelDefinition(1);
        const now = Date.now();
        socket.data.game = {
            mode: 'match3', liv: 1, board: createBoard(definition.size), definition,
            score: 0, totalScore: 0, movesLeft: definition.moves,
            campaignStartTime: now, finishing: false,
        };
        io.to(socket.id).emit('gameSet', match3Payload(socket.data.game));
    };

    function match3Payload(game, extra = {}) {
        return {
            mode: 'match3', board: game.board, liv: game.liv, score: game.score,
            totalScore: game.totalScore, movesLeft: game.movesLeft,
            definition: game.definition,
            elapsedMs: Date.now() - game.campaignStartTime,
            ...extra,
        };
    }

    const finishMatch3Loss = async function (socket, game) {
        if (game.finishing || socket.data.game !== game) return;
        game.finishing = true;
        const finalScore = game.totalScore + game.score;
        const elapsedMs = Date.now() - game.campaignStartTime;
        try {
            const scoreId = await saveScore({
                nickname: socket.data.username, mode: 'campaign-total', score: finalScore,
                elapsedMs, level: game.liv,
            });
            if (!socket.data.renameableScoreIds) socket.data.renameableScoreIds = new Set();
            socket.data.renameableScoreIds.add(scoreId);
        } catch (e) {
            console.error('Errore salvataggio match-3:', e.message);
        }
        socket.data.game = null;
        socket.emit('campaignLost', { score: finalScore, elapsedMs, liv: game.liv, reason: 'moves' });
    };

    const match3Move = function (payload) {
        const socket = this;
        const game = socket.data.game;
        if (!game || !['match3', 'match3-1vs1'].includes(game.mode) || game.finishing || game.movesLeft <= 0) return;
        const result = makeMove(game.board, payload && payload.from, payload && payload.to);
        if (!result.valid) {
            socket.emit('match3Invalid');
            return;
        }
        game.board = result.board;
        game.movesLeft -= 1;

        if (game.mode === 'match3-1vs1') {
            game.scores.set(socket.id, (game.scores.get(socket.id) || 0) + result.score);
            io.to(game.roomId).emit('match3State', {
                mode: game.mode, board: game.board, movesLeft: game.movesLeft,
                definition: game.definition, steps: result.steps, gained: result.score,
                by: socket.id, playerScores: Object.fromEntries(game.scores),
                elapsedMs: Date.now() - game.startTime,
            });
            if (game.movesLeft <= 0) void finishOneVsOne(game);
            return;
        }

        game.score += result.score;

        if (game.score >= game.definition.targetScore) {
            const completedScore = game.score;
            const nextLevel = game.liv + 1;
            game.totalScore += completedScore;
            if (nextLevel > 10) {
                const elapsedMs = Date.now() - game.campaignStartTime;
                socket.emit('gameOverAck', { score: game.totalScore, elapsedMs, topScores: [], liv: 10 });
                socket.data.game = null;
                return;
            }
            game.liv = nextLevel;
            game.definition = levelDefinition(nextLevel);
            game.board = createBoard(game.definition.size);
            game.score = 0;
            game.movesLeft = game.definition.moves;
            socket.emit('gameSet', match3Payload(game, {
                levelComplete: { previousLiv: nextLevel - 1, score: completedScore, totalScore: game.totalScore },
            }));
            return;
        }

        socket.emit('match3State', match3Payload(game, { steps: result.steps, gained: result.score }));
        if (game.movesLeft <= 0) void finishMatch3Loss(socket, game);
    };

    const gameOnline1vs1 = function (action) {
        const socket = this;
        if (action !== 'join') return;

        clearCampaignDeadline(socket.data.game);
        clearSelectionTimers(socket.data.game);

        if (socket.data.game && socket.data.game.mode === 'match3-1vs1') return;
        if (waitingQueue.includes(socket)) {
            io.to(socket.id).emit('gameSet', { mode: '1vs1-wait', data: 'In attesa di un avversario...' });
            return;
        }

        let opponent;
        while (waitingQueue.length && !opponent) {
            const candidate = waitingQueue.shift();
            if (candidate !== socket && candidate.connected && !candidate.data.game) opponent = candidate;
        }
        if (!opponent) {
            waitingQueue.push(socket);
            io.to(socket.id).emit('gameSet', { mode: '1vs1-wait', data: 'In attesa di un avversario...' });
            return;
        }

        const roomId = `room-${opponent.id}-${socket.id}`;
        socket.join(roomId);
        opponent.join(roomId);

        // tabellone condiviso: stesso puzzle per entrambi, un bottone selezionato da un giocatore
        // non è selezionabile dall'altro finché non viene risolto (accoppiato o scartato)
        const definition = { ...levelDefinition(3), moves: 30, targetScore: null };
        const gameState = {
            mode: 'match3-1vs1',
            board: createBoard(definition.size),
            definition,
            movesLeft: definition.moves,
            startTime: Date.now(),
            roomId,
            decided: false,
            scores: new Map([[socket.id, 0], [opponent.id, 0]]),
        };
        socket.data.game = gameState;
        opponent.data.game = gameState;

        io.to(roomId).emit('gameSet', {
            mode: 'match3-1vs1', board: gameState.board, definition, movesLeft: definition.moves,
            playerScores: Object.fromEntries(gameState.scores), roomId, elapsedMs: 0,
        });
    };

    // risolve la fine di una partita 1vs1: salva i punteggi e dichiara vincitore/pareggio
    const finishOneVsOne = async function (game) {
        if (game.decided) return;
        game.decided = true;

        const elapsedMs = Date.now() - game.startTime;
        const entries = Array.from(game.scores.entries());
        const savedScoreIds = new Map();

        for (const [id, score] of entries) {
            const s = io.sockets.sockets.get(id);
            try {
                const scoreId = await saveScore({
                    nickname: s ? s.data.username : 'anonimo',
                    mode: game.mode === 'pairs-1vs1' ? 'pairs-1vs1' : 'number-blast-1vs1',
                    score, elapsedMs, level: 1,
                });
                savedScoreIds.set(id, scoreId);
            } catch (e) {
                console.error('Errore salvataggio punteggio 1vs1:', e.message);
            }
        }

        const [[idA, scoreA], [idB, scoreB]] = entries;
        let winnerId = null;
        if (scoreA > scoreB) winnerId = idA;
        else if (scoreB > scoreA) winnerId = idB;

        entries.forEach(([id, score]) => {
            const s = io.sockets.sockets.get(id);
            if (!s) return;
            const opponentScore = entries.find(([oid]) => oid !== id)[1];
            const result = winnerId === null ? 'draw' : (id === winnerId ? 'win' : 'lose');
            if (result === 'lose' && savedScoreIds.has(id)) {
                if (!s.data.renameableScoreIds) s.data.renameableScoreIds = new Set();
                s.data.renameableScoreIds.add(savedScoreIds.get(id));
            }
            s.emit('gameResult', { result, score, opponentScore, elapsedMs });
            s.data.game = null;
            s.leave(game.roomId);
        });
    };

    const pairStart = function () {
        const socket = this;
        removeFromWaitingQueue(socket);
        clearCampaignDeadline(socket.data.game);
        clearSelectionTimers(socket.data.game);
        const config = levelConfig(1);
        const puzzle = generateCampaignPuzzle(config.numButtons, config.matchRule);
        const lockedIndices = lockedIndicesForPuzzle(puzzle, config.lockedCount);
        const now = Date.now();
        socket.data.game = {
            mode: 'campain', puzzle, liv: 1, totalScore: 0, levelScore: 0,
            startTime: now, campaignStartTime: now, matched: new Set(), selections: new Map(),
            finishing: false, levelPenaltyMs: 0, totalPenaltyMs: 0, errors: 0,
            combo: 0, config, locked: new Set(lockedIndices),
        };
        socket.emit('gameSet', {
            mode: 'campain', puzzle, liv: 1, elapsedMs: 0, config, lockedIndices,
        });
        setCampaignDeadline(socket, socket.data.game);
    };

    const pairOnline1vs1 = function (action) {
        const socket = this;
        if (action !== 'join') return;
        if (socket.data.game && socket.data.game.mode === 'pairs-1vs1') return;

        clearCampaignDeadline(socket.data.game);
        clearSelectionTimers(socket.data.game);
        removeFromWaitingQueue(socket);
        if (pairsWaitingQueue.includes(socket)) {
            socket.emit('gameSet', { mode: 'pairs-1vs1-wait', data: 'In attesa di un avversario...' });
            return;
        }

        let opponent;
        while (pairsWaitingQueue.length && !opponent) {
            const candidate = pairsWaitingQueue.shift();
            if (candidate !== socket && candidate.connected && !candidate.data.game) opponent = candidate;
        }
        if (!opponent) {
            pairsWaitingQueue.push(socket);
            socket.emit('gameSet', { mode: 'pairs-1vs1-wait', data: 'In attesa di un avversario...' });
            return;
        }

        const roomId = `pairs-room-${opponent.id}-${socket.id}`;
        socket.join(roomId);
        opponent.join(roomId);
        const puzzle = generatePuzzle(200);
        const gameState = {
            mode: 'pairs-1vs1', puzzle, matched: new Set(), selections: new Map(),
            scores: new Map([[socket.id, 0], [opponent.id, 0]]),
            startTime: Date.now(), roomId, decided: false, finishing: false,
        };
        socket.data.game = gameState;
        opponent.data.game = gameState;
        io.to(roomId).emit('gameSet', { mode: 'pairs-1vs1', puzzle, elapsedMs: 0 });
    };

    const finishPairs = async function (socket, game) {
        if (game.finishing || socket.data.game !== game) return;
        game.finishing = true;
        const elapsedMs = Date.now() - game.startTime;
        try {
            const scoreId = await saveScore({
                nickname: socket.data.username, mode: 'pairs', score: game.score,
                elapsedMs, level: 1,
            });
            if (!socket.data.renameableScoreIds) socket.data.renameableScoreIds = new Set();
            socket.data.renameableScoreIds.add(scoreId);
        } catch (e) {
            console.error('Errore salvataggio Coppie:', e.message);
        }
        socket.data.game = null;
        socket.emit('pairsComplete', { score: game.score, elapsedMs, errors: game.errors });
    };

    const handlePairClick = function (socket, game, index) {
        if (game.matched.has(index) || game.pending === index) return;
        if (game.pending === null) {
            game.pending = index;
            socket.emit('buttonSelected', { index, by: socket.id });
            return;
        }
        const pending = game.pending;
        game.pending = null;
        const value = game.puzzle[pending];
        if (value !== game.puzzle[index]) {
            game.errors += 1;
            socket.emit('pairMismatch', { indices: [pending, index], errors: game.errors });
            return;
        }
        game.matched.add(pending);
        game.matched.add(index);
        let points = value === 'point' ? 60 : 10;
        const bonus = value === 'point' || value === 'bomb' ? value : null;
        const extraIndices = [];
        if (bonus === 'bomb') {
            const candidates = new Map();
            game.puzzle.forEach((tile, i) => {
                if (game.matched.has(i) || tile === 'bomb' || tile === 'point') return;
                if (!candidates.has(tile)) candidates.set(tile, []);
                candidates.get(tile).push(i);
            });
            const pairs = Array.from(candidates.values()).filter(items => items.length >= 2);
            if (pairs.length) {
                const chosen = pairs[Math.floor(Math.random() * pairs.length)].slice(0, 2);
                chosen.forEach(i => game.matched.add(i));
                extraIndices.push(...chosen);
                points += 10;
            }
        }
        game.score += points;
        socket.emit('pairMatched', {
            indices: [pending, index], extraIndices, by: socket.id, bonus, points,
        });
        if (game.matched.size >= game.puzzle.length) void finishPairs(socket, game);
    };

    // click su un bottone in modalità 1vs1: gestito interamente dal server per sincronizzare i due giocatori
    const gameClick = function (payload) {
        const socket = this;
        const game = socket.data.game;
        if (!game || game.decided || game.finishing) return;

        const index = Number(payload && payload.index);
        if (!Number.isInteger(index) || index < 0 || index >= game.puzzle.length) return;

        if (game.mode === 'pairs') {
            handlePairClick(socket, game, index);
            return;
        }

        if (game.mode === 'campain') {
            handleCampaignClick(socket, game, index);
            return;
        }
        if (game.mode !== 'pairs-1vs1') return;
        if (game.matched.has(index)) return;

        // già selezionato (da questo o dall'altro giocatore): non selezionabile
        for (const selectedIndex of game.selections.values()) {
            if (selectedIndex === index) return;
        }

        const pending = game.selections.get(socket.id);

        if (pending === undefined) {
            game.selections.set(socket.id, index);
            io.to(game.roomId).emit('buttonSelected', { index, by: socket.id });
            return;
        }

        // seconda selezione di questo giocatore: risolve la coppia
        game.selections.delete(socket.id);
        const value = game.puzzle[pending];
        const isMatch = value === game.puzzle[index];

        if (!isMatch) {
            io.to(game.roomId).emit('pairMismatch', { indices: [pending, index] });
            return;
        }

        game.matched.add(pending);
        game.matched.add(index);

        let points = 10;
        let bonus = null;
        if (value === 'point') {
            points += 50;
            bonus = 'point';
        } else if (value === 'bomb') {
            bonus = 'bomb';
        }

        const extraIndices = [];
        if (bonus === 'bomb') {
            // Atom the Bomb: distrugge un'altra coppia rimasta a caso
            const remainingByValue = new Map();
            game.puzzle.forEach((v, i) => {
                if (game.matched.has(i) || v === 'bomb' || v === 'point') return;
                if (!remainingByValue.has(v)) remainingByValue.set(v, []);
                remainingByValue.get(v).push(i);
            });
            const candidates = Array.from(remainingByValue.values()).filter((arr) => arr.length >= 2);
            if (candidates.length) {
                const chosen = candidates[Math.floor(Math.random() * candidates.length)];
                extraIndices.push(chosen[0], chosen[1]);
                chosen.forEach((i) => game.matched.add(i));
                points += 10;
            }
        }

        game.scores.set(socket.id, (game.scores.get(socket.id) || 0) + points);

        io.to(game.roomId).emit('pairMatched', { indices: [pending, index], extraIndices, by: socket.id, bonus, points });

        if (game.matched.size >= game.puzzle.length) {
            finishOneVsOne(game);
        }
    };

    const finishCampaignLevel = async function (socket, game) {
        if (game.finishing || socket.data.game !== game) return;
        game.finishing = true;
        clearCampaignDeadline(game);
        clearSelectionTimers(game);

        const levelElapsedMs = Date.now() - game.startTime + game.levelPenaltyMs;
        const elapsedMs = Date.now() - game.campaignStartTime + game.totalPenaltyMs;
        const score = game.levelScore;

        try {
            await saveScore({ nickname: socket.data.username, mode: game.mode, score, elapsedMs: levelElapsedMs, level: game.liv || 1 });
        } catch (e) {
            console.error('Errore salvataggio punteggio:', e.message);
        }

        // modalità campaign: livello superato, si passa automaticamente al successivo con più bottoni
        const totalScore = (game.totalScore || 0) + score;
        const nextLiv = (game.liv || 1) + 1;

        if (nextLiv > MAX_LEVEL) {
            let topScores = [];
            try { topScores = await getTopScores(); }
            catch (e) { console.error('Errore lettura classifica:', e.message); }
            io.to(socket.id).emit('gameOverAck', { score: totalScore, elapsedMs, topScores, liv: game.liv });
            socket.data.game = null;
            return;
        }

        const config = levelConfig(nextLiv);
        const nextPuzzle = generateCampaignPuzzle(config.numButtons, config.matchRule);
        const lockedIndices = lockedIndicesForPuzzle(nextPuzzle, config.lockedCount);
        socket.data.game = {
            mode: 'campain', puzzle: nextPuzzle, liv: nextLiv, totalScore, levelScore: 0,
            startTime: Date.now(), campaignStartTime: game.campaignStartTime,
            matched: new Set(), selections: new Map(), finishing: false,
            levelPenaltyMs: 0, totalPenaltyMs: game.totalPenaltyMs, errors: 0, combo: 0, config,
            locked: new Set(lockedIndices),
        };
        io.to(socket.id).emit('gameSet', {
            mode: 'campain',
            puzzle: nextPuzzle,
            liv: nextLiv,
            elapsedMs,
            config,
            lockedIndices,
            levelComplete: { previousLiv: game.liv || 1, score, totalScore },
        });
        setCampaignDeadline(socket, socket.data.game);
    };

    const handleCampaignClick = function (socket, game, index) {
        if (game.matched.has(index) || game.selections.has(index) || game.locked.has(index)) return;
        if (game.selections.size >= game.config.maxSelections) {
            socket.emit('selectionLimit', { max: game.config.maxSelections });
            return;
        }

        const selectionTimer = setTimeout(() => {
            if (socket.data.game !== game || game.finishing || !game.selections.has(index)) return;
            game.selections.delete(index);
            game.errors += 1;
            game.combo = 0;
            game.levelPenaltyMs += game.config.penaltyMs;
            game.totalPenaltyMs += game.config.penaltyMs;
            socket.emit('selectionExpired', {
                index, errors: game.errors, penaltyMs: game.config.penaltyMs,
                shuffle: game.config.shuffleOnMismatch,
            });
            if (game.config.penaltyMs) setCampaignDeadline(socket, game);
        }, game.config.selectionMs);
        if (typeof selectionTimer.unref === 'function') selectionTimer.unref();
        game.selections.set(index, selectionTimer);
        socket.emit('buttonSelected', {
            index, by: socket.id, expiresInMs: game.config.selectionMs,
            selectedCount: game.selections.size, maxSelections: game.config.maxSelections,
        });

        const requiredSize = requiredGroupSize(game, index);
        const matchingIndices = [
            index,
            ...Array.from(game.selections.keys()).filter(selectedIndex =>
                selectedIndex !== index
                    && valuesMatch(game.puzzle[selectedIndex], game.puzzle[index], game.config.matchRule)
            ),
        ];
        if (matchingIndices.length < requiredSize) return;

        const completedIndices = matchingIndices.slice(0, requiredSize);
        clearSelectedIndices(game, completedIndices);
        const value = game.puzzle[index];
        completedIndices.forEach(matchedIndex => game.matched.add(matchedIndex));
        game.combo += 1;
        const multiplier = game.config.combo ? Math.min(game.combo, 5) : 1;
        let points = (value === 'point' ? 60 : 10 + (completedIndices.length - 2) * 10) * multiplier;
        const bonus = value === 'point' || value === 'bomb' ? value : null;
        const extraIndices = [];

        if (bonus === 'bomb') {
            const pairs = new Map();
            game.puzzle.forEach((v, i) => {
                if (game.matched.has(i) || v === 'bomb' || v === 'point') return;
                if (!pairs.has(v)) pairs.set(v, []);
                pairs.get(v).push(i);
            });
            const candidates = Array.from(pairs.values()).filter(pair => pair.length === 2);
            if (candidates.length) {
                const chosen = candidates[Math.floor(Math.random() * candidates.length)].slice(0, 2);
                clearSelectedIndices(game, chosen);
                chosen.forEach(i => game.matched.add(i));
                extraIndices.push(...chosen);
                points += 10 * multiplier;
            }
        }

        game.levelScore += points;
        socket.emit('pairMatched', {
            indices: completedIndices, extraIndices, by: socket.id, bonus, points,
            combo: game.combo, multiplier, removedGroups: 1 + (extraIndices.length ? 1 : 0),
        });
        if (game.locked.size && game.matched.size >= 4) {
            const unlockedIndices = Array.from(game.locked);
            game.locked.clear();
            socket.emit('unlockButtons', { indices: unlockedIndices });
        }
        // Una tessera senza coppia può restare scoperta: il livello termina quando
        // non esistono più abbinamenti possibili tra le tessere rimaste.
        if (!hasRemainingMatch(game.puzzle, game.matched, game.config.matchRule)) {
            void finishCampaignLevel(socket, game);
        }
    };

    // Evento mantenuto per client vecchi: non accetta né salva più punteggi forniti dal browser.
    const gameOver = function () {};

    const gameDisconnectCleanup = function () {
        const socket = this;
        removeFromWaitingQueue(socket);
        clearCampaignDeadline(socket.data.game);
        clearSelectionTimers(socket.data.game);

        const game = socket.data.game;
        if (game && ['match3-1vs1', 'pairs-1vs1'].includes(game.mode) && game.roomId && !game.decided) {
            game.decided = true;
            socket.to(game.roomId).emit('gameResult', {
                result: 'win', reason: 'opponent-disconnected', elapsedMs: Date.now() - game.startTime,
            });

            const opponentId = Array.from(game.scores.keys()).find((id) => id !== socket.id);
            const opponentSocket = opponentId && io.sockets.sockets.get(opponentId);
            if (opponentSocket) opponentSocket.data.game = null;
        }
    };

    function removeFromWaitingQueue(socket) {
        let idx;
        while ((idx = waitingQueue.indexOf(socket)) !== -1) waitingQueue.splice(idx, 1);
        while ((idx = pairsWaitingQueue.indexOf(socket)) !== -1) pairsWaitingQueue.splice(idx, 1);
    }

    const statsRequest = async function () {
        const socket = this;
        try {
            const topScores = await getTopScores();
            io.to(socket.id).emit('statsData', topScores);
        } catch (e) {
            console.error('Errore lettura classifica:', e.message);
        }
    };

    const sudokuStart = function () {
        const socket = this;
        removeFromWaitingQueue(socket);
        clearCampaignDeadline(socket.data.game);
        clearSelectionTimers(socket.data.game);
        const { puzzle, solution } = createSudoku(42);
        socket.data.game = {
            mode: 'sudoku', board: puzzle.map(row => [...row]), solution,
            fixed: puzzle.map(row => row.map(Boolean)), errors: 0, startTime: Date.now(), finishing: false,
        };
        socket.emit('sudokuSet', { board: puzzle, fixed: socket.data.game.fixed, errors: 0, elapsedMs: 0 });
    };

    const sudokuInput = async function (payload) {
        const socket = this;
        const game = socket.data.game;
        if (!game || game.mode !== 'sudoku' || game.finishing) return;
        const row = Number(payload && payload.row);
        const col = Number(payload && payload.col);
        const value = Number(payload && payload.value);
        if (![row, col].every(n => Number.isInteger(n) && n >= 0 && n < 9)
            || !Number.isInteger(value) || value < 1 || value > 9 || game.fixed[row][col]) return;
        if (game.solution[row][col] !== value) {
            game.errors += 1;
            socket.emit('sudokuCell', { row, col, value, correct: false, errors: game.errors });
            return;
        }
        game.board[row][col] = value;
        socket.emit('sudokuCell', { row, col, value, correct: true, errors: game.errors });
        if (!isComplete(game.board)) return;

        game.finishing = true;
        const elapsedMs = Date.now() - game.startTime;
        const score = Math.max(100, Math.round(10000 - elapsedMs / 100 - game.errors * 500));
        try {
            const scoreId = await saveScore({ nickname: socket.data.username, mode: 'sudoku', score, elapsedMs, level: 1 });
            if (!socket.data.renameableScoreIds) socket.data.renameableScoreIds = new Set();
            socket.data.renameableScoreIds.add(scoreId);
        } catch (e) {
            console.error('Errore salvataggio Sudoku:', e.message);
        }
        socket.data.game = null;
        socket.emit('sudokuComplete', { score, elapsedMs, errors: game.errors });
    };

    const setScoreNickname = async function (value) {
        const socket = this;
        const nickname = normalizeNickname(value);
        if (!nickname) {
            socket.emit('nicknameResult', { ok: false, error: 'Usa da 2 a 24 lettere, numeri, spazi, _ o -.' });
            return;
        }
        const ids = socket.data.renameableScoreIds;
        if (!ids || ids.size === 0) return;
        try {
            await Promise.all(Array.from(ids).map(id => updateScoreNickname(id, nickname)));
            ids.clear();
            socket.data.username = nickname;
            socket.emit('nicknameResult', { ok: true, nickname });
        } catch (e) {
            console.error('Errore aggiornamento nickname:', e.message);
            socket.emit('nicknameResult', { ok: false, error: 'Nome non salvato. Riprova.' });
        }
    };

    return {
        gameStart, gameOnline1vs1, gameClick, gameOver, gameDisconnectCleanup,
        statsRequest, setScoreNickname, match3Move,
        sudokuStart, sudokuInput,
        pairStart, pairOnline1vs1,
    };
};

module.exports._test = {
    levelConfig, generatePuzzle, generateCampaignPuzzle, valuesMatch, hasRemainingMatch,
    lockedIndicesForPuzzle, normalizeNickname, MAX_LEVEL,
};
