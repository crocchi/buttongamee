const { saveScore, getTopScores } = require('../db/scoreModel');

// giocatori in attesa di un avversario per la modalità 1vs1
const waitingQueue = [];

// livello massimo della campagna: oltre questo la partita finisce davvero
const MAX_LEVEL = 6;

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// più si sale di livello più bottoni ci sono (difficoltà crescente), fino a un tetto massimo
function numButtonsForLevel(liv) {
    return Math.min(12 + (Math.max(1, liv) - 1) * 4, 30);
}

// genera coppie di numeri uguali (es. num=20 -> 10 coppie, 20 bottoni)
// se ci sono abbastanza coppie, due di esse diventano i bonus speciali del gioco originale:
// 'point' (Atom the Point: punti extra) e 'bomb' (Atom the Bomb: distrugge un'altra coppia a caso)
function generatePuzzle(numButtons) {
    const pairs = Math.max(2, Math.floor((numButtons || 20) / 2));
    const values = [];
    for (let v = 1; v <= pairs; v++) {
        values.push(v, v);
    }
    if (pairs >= 4) {
        values[0] = 'point'; values[1] = 'point';
        values[2] = 'bomb'; values[3] = 'bomb';
    }
    return shuffle(values);
}

module.exports = (io, main) => {

    const gameStart = function (liv) {
        const socket = this;
        const startLiv = liv || 1;
        const puzzle = generatePuzzle(numButtonsForLevel(startLiv));
        socket.data.game = { mode: 'campain', puzzle, liv: startLiv, totalScore: 0, startTime: Date.now() };
        io.to(socket.id).emit('gameSet', { mode: 'campain', puzzle, liv: startLiv });
    };

    const gameOnline1vs1 = function (action) {
        const socket = this;
        if (action !== 'join') return;

        const opponent = waitingQueue.shift();
        if (!opponent || !opponent.connected) {
            waitingQueue.push(socket);
            io.to(socket.id).emit('gameSet', { mode: '1vs1-wait', data: 'In attesa di un avversario...' });
            return;
        }

        const roomId = `room-${opponent.id}-${socket.id}`;
        socket.join(roomId);
        opponent.join(roomId);

        // tabellone condiviso: stesso puzzle per entrambi, un bottone selezionato da un giocatore
        // non è selezionabile dall'altro finché non viene risolto (accoppiato o scartato)
        const puzzle = generatePuzzle(20);
        const gameState = {
            mode: '1vs1',
            puzzle,
            startTime: Date.now(),
            roomId,
            decided: false,
            matched: new Set(),
            selections: new Map(), // socket.id -> indice in attesa di essere accoppiato
            scores: new Map([[socket.id, 0], [opponent.id, 0]]),
        };
        socket.data.game = gameState;
        opponent.data.game = gameState;

        io.to(roomId).emit('gameSet', { mode: '1vs1', puzzle, roomId });
    };

    // risolve la fine di una partita 1vs1: salva i punteggi e dichiara vincitore/pareggio
    const finishOneVsOne = async function (game) {
        if (game.decided) return;
        game.decided = true;

        const elapsedMs = Date.now() - game.startTime;
        const entries = Array.from(game.scores.entries());

        for (const [id, score] of entries) {
            const s = io.sockets.sockets.get(id);
            try {
                await saveScore({ nickname: s ? s.data.username : 'anonimo', mode: '1vs1', score, elapsedMs, level: 1 });
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
            s.emit('gameResult', { result, score, opponentScore });
            s.data.game = null;
            s.leave(game.roomId);
        });
    };

    // click su un bottone in modalità 1vs1: gestito interamente dal server per sincronizzare i due giocatori
    const gameClick = function (payload) {
        const socket = this;
        const game = socket.data.game;
        if (!game || game.mode !== '1vs1' || game.decided) return;

        const index = Number(payload && payload.index);
        if (!Number.isInteger(index) || index < 0 || index >= game.puzzle.length) return;
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

    const gameOver = async function (payload) {
        const socket = this;
        const game = socket.data.game;
        if (!game || game.mode !== 'campain') return;

        const elapsedMs = Date.now() - game.startTime;
        const score = Math.max(0, Number(payload && payload.score) || 0);

        try {
            await saveScore({ nickname: socket.data.username, mode: game.mode, score, elapsedMs, level: game.liv || 1 });
        } catch (e) {
            console.error('Errore salvataggio punteggio:', e.message);
        }

        // modalità campaign: livello superato, si passa automaticamente al successivo con più bottoni
        const totalScore = (game.totalScore || 0) + score;
        const nextLiv = (game.liv || 1) + 1;

        if (nextLiv > MAX_LEVEL) {
            const topScores = await getTopScores();
            io.to(socket.id).emit('gameOverAck', { score: totalScore, elapsedMs, topScores, liv: game.liv });
            socket.data.game = null;
            return;
        }

        const nextPuzzle = generatePuzzle(numButtonsForLevel(nextLiv));
        socket.data.game = { mode: 'campain', puzzle: nextPuzzle, liv: nextLiv, totalScore, startTime: Date.now() };
        io.to(socket.id).emit('gameSet', {
            mode: 'campain',
            puzzle: nextPuzzle,
            liv: nextLiv,
            levelComplete: { previousLiv: game.liv || 1, score, totalScore },
        });
    };

    const gameDisconnectCleanup = function () {
        const socket = this;
        const idx = waitingQueue.indexOf(socket);
        if (idx !== -1) waitingQueue.splice(idx, 1);

        const game = socket.data.game;
        if (game && game.mode === '1vs1' && game.roomId && !game.decided) {
            game.decided = true;
            socket.to(game.roomId).emit('gameResult', { result: 'win', reason: 'opponent-disconnected' });

            const opponentId = Array.from(game.scores.keys()).find((id) => id !== socket.id);
            const opponentSocket = opponentId && io.sockets.sockets.get(opponentId);
            if (opponentSocket) opponentSocket.data.game = null;
        }
    };

    const statsRequest = async function () {
        const socket = this;
        try {
            const topScores = await getTopScores();
            io.to(socket.id).emit('statsData', topScores);
        } catch (e) {
            console.error('Errore lettura classifica:', e.message);
        }
    };

    return { gameStart, gameOnline1vs1, gameClick, gameOver, gameDisconnectCleanup, statsRequest };
};
