const test = require('node:test');
const assert = require('node:assert/strict');

function makeHarness(id = 'player-1') {
    const emitted = [];
    const rooms = [];
    const socket = {
        id,
        connected: true,
        data: { username: id },
        emit(event, payload) { emitted.push({ event, payload }); },
        join(room) { rooms.push(room); },
        leave() {},
        to() { return { emit() {} }; },
    };
    const sockets = new Map([[id, socket]]);
    const io = {
        sockets: { sockets },
        to() { return { emit(event, payload) { emitted.push({ event, payload }); } }; },
    };
    const handlers = require('../event/game')(io, {});
    return { socket, emitted, rooms, handlers, sockets };
}

test('la campagna non permette di saltare direttamente a un livello arbitrario', () => {
    const { socket, handlers } = makeHarness();
    handlers.gameStart.call(socket, 999);
    assert.equal(socket.data.game.liv, 1);
    assert.equal(socket.data.game.mode, 'match3');
    assert.equal(socket.data.game.board.length, 6);
});

test('due richieste 1vs1 dello stesso socket non lo abbinano con sé stesso', () => {
    const { socket, handlers, rooms } = makeHarness('solo-player');
    handlers.gameOnline1vs1.call(socket, 'join');
    handlers.gameOnline1vs1.call(socket, 'join');

    assert.equal(rooms.length, 0);
    assert.equal(socket.data.game, undefined);
});

test('la campagna definisce dieci mondi fino al livello 100', () => {
    const { levelConfig, MAX_LEVEL } = require('../event/game')._test;
    assert.equal(MAX_LEVEL, 100);
    assert.deepEqual(
        [1, 10, 11, 30, 40, 60, 70, 80, 90, 100].map(level => levelConfig(level).world),
        [1, 1, 2, 3, 4, 6, 7, 8, 9, 10]
    );
    assert.equal(levelConfig(11).hidden, true);
    assert.equal(levelConfig(11).previewMs, 15000);
    assert.equal(levelConfig(20).previewMs, 6000);
    assert.equal(levelConfig(15).exposedCount, 2);
    assert.equal(levelConfig(30).penaltyMs, 3000);
    assert.equal(levelConfig(40).combo, true);
    assert.equal(levelConfig(50).lockedCount, 2);
    assert.equal(levelConfig(60).shuffleOnMismatch, true);
    assert.equal(levelConfig(70).matchRule, 'sum10');
    assert.equal(levelConfig(80).noColor, true);
    assert.equal(levelConfig(100).boss, true);
    assert.equal(levelConfig(1).numButtons, 5);
    assert.equal(levelConfig(2).numButtons, 10);
    assert.equal(levelConfig(3).numButtons, 15);
    assert.equal(levelConfig(50).numButtons, 250);
    assert.equal(levelConfig(100).numButtons, 500);
    assert.equal(levelConfig(1).selectionMs, 4000);
    assert.equal(levelConfig(100).selectionMs, 1030);
    assert.equal(levelConfig(100).maxSelections, 4);
});

test('il nome classifica viene normalizzato e validato', () => {
    const { normalizeNickname } = require('../event/game')._test;
    assert.equal(normalizeNickname('  Mario   Rossi  '), 'Mario Rossi');
    assert.equal(normalizeNickname('Léa_99'), 'Léa_99');
    assert.equal(normalizeNickname('<script>'), null);
    assert.equal(normalizeNickname('x'), null);
});

test('le classifiche separano correttamente le modalità per gioco', () => {
    const { GAME_MODE_GROUPS } = require('../db/scoreModel');
    assert.deepEqual(Object.keys(GAME_MODE_GROUPS), ['numberBlast', 'pairs', 'sudoku', 'escapeMath']);
    assert.equal(GAME_MODE_GROUPS.numberBlast.includes('number-blast-1vs1'), true);
    assert.equal(GAME_MODE_GROUPS.pairs.includes('pairs-1vs1'), true);
    assert.deepEqual(GAME_MODE_GROUPS.sudoku, ['sudoku']);
    assert.deepEqual(GAME_MODE_GROUPS.escapeMath, ['escape-math', 'escape-math-1vs1']);
    const allModes = Object.values(GAME_MODE_GROUPS).flat();
    assert.equal(new Set(allModes).size, allModes.length);
});

test('i livelli somma 10 generano soltanto coppie compatibili', () => {
    const { generatePuzzle, valuesMatch } = require('../event/game')._test;
    const puzzle = generatePuzzle(30, 'sum10');
    const numericCounts = new Map();
    puzzle.filter(value => typeof value === 'number').forEach(value => {
        numericCounts.set(value, (numericCounts.get(value) || 0) + 1);
    });
    for (const [value, count] of numericCounts) {
        assert.equal(numericCounts.get(10 - value), count);
        assert.equal(valuesMatch(value, 10 - value, 'sum10'), true);
    }
});

test('un puzzle dispari usa coppie e tris senza numeri segnaposto', () => {
    const { generateCampaignPuzzle, hasRemainingMatch } = require('../event/game')._test;
    const puzzle = generateCampaignPuzzle(5, 'equal');
    assert.equal(puzzle.length, 5);
    assert.equal(Math.max(...puzzle.filter(value => typeof value === 'number')), 2);

    const counts = new Map();
    puzzle.forEach(value => counts.set(value, (counts.get(value) || 0) + 1));
    assert.deepEqual(Array.from(counts.values()).sort(), [2, 3]);

    const matched = new Set(puzzle.map((_, index) => index));
    assert.equal(hasRemainingMatch(puzzle, matched, 'equal'), false);
});

test('la campagna Coppie parte dal livello 1 e valida gli abbinamenti sul server', () => {
    const { socket, emitted, handlers } = makeHarness('pairs-player');
    handlers.pairStart.call(socket);

    assert.equal(socket.data.game.mode, 'campain');
    assert.equal(socket.data.game.liv, 1);
    assert.equal(socket.data.game.puzzle.length, 5);

    const firstIndex = socket.data.game.puzzle.findIndex(value =>
        socket.data.game.puzzle.filter(item => item === value).length === 2
    );
    const value = socket.data.game.puzzle[firstIndex];
    const secondIndex = socket.data.game.puzzle.findIndex((item, index) => item === value && index !== firstIndex);

    handlers.gameClick.call(socket, { index: firstIndex });
    handlers.gameClick.call(socket, { index: secondIndex });

    assert.equal(socket.data.game.matched.has(firstIndex), true);
    assert.equal(socket.data.game.matched.has(secondIndex), true);
    assert.equal(emitted.some(({ event }) => event === 'pairMatched'), true);
});

test('la campagna permette fino a quattro tessere aperte contemporaneamente', () => {
    const { socket, emitted, handlers } = makeHarness('multi-select-player');
    const { generatePuzzle } = require('../event/game')._test;
    handlers.pairStart.call(socket);
    socket.data.game.puzzle = generatePuzzle(10, 'equal');

    const distinctIndices = [];
    const seen = new Set();
    socket.data.game.puzzle.forEach((value, index) => {
        if (!seen.has(value)) {
            seen.add(value);
            distinctIndices.push(index);
        }
    });
    distinctIndices.slice(0, 4).forEach(index => handlers.gameClick.call(socket, { index }));
    assert.equal(socket.data.game.selections.size, 4);

    handlers.gameClick.call(socket, { index: distinctIndices[4] });
    assert.equal(socket.data.game.selections.size, 4);
    assert.equal(emitted.some(({ event }) => event === 'selectionLimit'), true);
    assert.equal(
        emitted.filter(({ event }) => event === 'buttonSelected').every(({ payload }) => payload.expiresInMs === 4000),
        true
    );
});

test('un tris si rompe soltanto dopo la terza tessera uguale', () => {
    const { socket, emitted, handlers } = makeHarness('triple-player');
    handlers.pairStart.call(socket);
    const counts = new Map();
    socket.data.game.puzzle.forEach((value, index) => {
        if (!counts.has(value)) counts.set(value, []);
        counts.get(value).push(index);
    });
    const triple = Array.from(counts.values()).find(indices => indices.length === 3);

    handlers.gameClick.call(socket, { index: triple[0] });
    handlers.gameClick.call(socket, { index: triple[1] });
    assert.equal(socket.data.game.matched.size, 0);
    assert.equal(socket.data.game.selections.size, 2);

    handlers.gameClick.call(socket, { index: triple[2] });
    assert.equal(triple.every(index => socket.data.game.matched.has(index)), true);
    assert.equal(
        emitted.some(({ event, payload }) => event === 'pairMatched' && payload.indices.length === 3),
        true
    );
});

test('Coppie 1vs1 abbina due giocatori su una griglia condivisa', () => {
    const emitted = [];
    const roomMembers = new Map();
    const makeSocket = id => ({
        id, connected: true, data: { username: id },
        emit(event, payload) { emitted.push({ target: id, event, payload }); },
        join(room) {
            if (!roomMembers.has(room)) roomMembers.set(room, new Set());
            roomMembers.get(room).add(id);
        },
        leave() {},
        to() { return { emit() {} }; },
    });
    const first = makeSocket('pairs-a');
    const second = makeSocket('pairs-b');
    const sockets = new Map([[first.id, first], [second.id, second]]);
    const io = {
        sockets: { sockets },
        to(target) {
            return {
                emit(event, payload) {
                    const recipients = roomMembers.get(target) || new Set([target]);
                    recipients.forEach(id => emitted.push({ target: id, event, payload }));
                },
            };
        },
    };
    const handlers = require('../event/game')(io, {});

    handlers.pairOnline1vs1.call(first, 'join');
    handlers.pairOnline1vs1.call(second, 'join');

    assert.equal(first.data.game, second.data.game);
    assert.equal(first.data.game.mode, 'pairs-1vs1');
    assert.equal(first.data.game.puzzle.length, 200);
    assert.equal(first.data.game.puzzle.length / 2, 100);
    assert.equal(first.data.game.scores.size, 2);
    assert.equal(emitted.filter(({ event }) => event === 'gameSet').some(({ payload }) => payload.mode === 'pairs-1vs1'), true);
});

test('Escape Math perde una vita con un errore e avanza con la risposta corretta', () => {
    const { socket, emitted, handlers } = makeHarness('escape-player');
    handlers.escapeStart.call(socket);
    assert.equal(socket.data.game.mode, 'escape-math');
    assert.equal(socket.data.game.level, 1);
    assert.equal(socket.data.game.lives, 3);

    const firstPuzzleId = socket.data.game.puzzleId;
    const wrong = socket.data.game.puzzle.choices.find(choice => choice !== socket.data.game.puzzle.answer);
    handlers.escapeAnswer.call(socket, { puzzleId: firstPuzzleId, answer: wrong });
    assert.equal(socket.data.game.lives, 2);
    assert.equal(socket.data.game.level, 1);

    const answer = socket.data.game.puzzle.answer;
    handlers.escapeAnswer.call(socket, { puzzleId: socket.data.game.puzzleId, answer });
    assert.equal(socket.data.game.level, 2);
    assert.equal(socket.data.game.score > 0, true);
    assert.equal(emitted.some(({ event }) => event === 'escapeState'), true);
});

test('Escape Math 1vs1 abbina due giocatori con gli stessi dieci enigmi', () => {
    const emitted = [];
    const roomMembers = new Map();
    const makeSocket = id => ({
        id, connected: true, data: { username: id },
        emit(event, payload) { emitted.push({ target: id, event, payload }); },
        join(room) {
            if (!roomMembers.has(room)) roomMembers.set(room, new Set());
            roomMembers.get(room).add(id);
        },
        leave() {},
        to() { return { emit() {} }; },
    });
    const first = makeSocket('escape-a');
    const second = makeSocket('escape-b');
    const sockets = new Map([[first.id, first], [second.id, second]]);
    const io = {
        sockets: { sockets },
        to(target) {
            return {
                emit(event, payload) {
                    const recipients = roomMembers.get(target) || new Set([target]);
                    recipients.forEach(id => emitted.push({ target: id, event, payload }));
                },
            };
        },
    };
    const handlers = require('../event/game')(io, {});

    handlers.escapeOnline1vs1.call(first, 'join');
    handlers.escapeOnline1vs1.call(second, 'join');

    const game = first.data.game;
    assert.equal(game, second.data.game);
    assert.equal(game.mode, 'escape-math-1vs1');
    assert.equal(game.puzzles.length, 10);
    const starts = emitted.filter(({ event }) => event === 'escapeSet');
    assert.equal(starts.length, 2);
    assert.equal(starts[0].payload.prompt, starts[1].payload.prompt);
    assert.deepEqual(starts[0].payload.choices, starts[1].payload.choices);

    handlers.escapeAnswer.call(first, { puzzleId: 1, answer: game.puzzles[0].answer });
    assert.equal(game.players.get(first.id).completed, 1);
    assert.equal(game.players.get(second.id).completed, 0);
    assert.equal(emitted.some(({ event }) => event === 'escapeVersusUpdate'), true);
    clearTimeout(game.escapeTimers.get(first.id));
    clearTimeout(game.escapeTimers.get(second.id));
});

test('la campagna Sudoku parte da un quadrato 3x3 e avanza al 4x4', () => {
    const { socket, handlers } = makeHarness('sudoku-campaign-player');
    handlers.sudokuStart.call(socket);
    assert.equal(socket.data.game.level, 1);
    assert.equal(socket.data.game.definition.size, 3);
    assert.equal(socket.data.game.board.flat().filter(value => value === 0).length, 3);

    const game = socket.data.game;
    game.board.forEach((row, rowIndex) => row.forEach((value, colIndex) => {
        if (!value) handlers.sudokuInput.call(socket, {
            row: rowIndex, col: colIndex, value: game.solution[rowIndex][colIndex],
        });
    }));

    assert.equal(socket.data.game.level, 2);
    assert.equal(socket.data.game.definition.size, 4);
});
