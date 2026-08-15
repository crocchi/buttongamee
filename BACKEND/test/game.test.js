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
});

test('il nome classifica viene normalizzato e validato', () => {
    const { normalizeNickname } = require('../event/game')._test;
    assert.equal(normalizeNickname('  Mario   Rossi  '), 'Mario Rossi');
    assert.equal(normalizeNickname('Léa_99'), 'Léa_99');
    assert.equal(normalizeNickname('<script>'), null);
    assert.equal(normalizeNickname('x'), null);
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

test('la modalità Coppie crea 20 tessere e valida gli abbinamenti sul server', () => {
    const { socket, emitted, handlers } = makeHarness('pairs-player');
    handlers.pairStart.call(socket);

    assert.equal(socket.data.game.mode, 'pairs');
    assert.equal(socket.data.game.puzzle.length, 20);

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
    assert.equal(first.data.game.puzzle.length, 24);
    assert.equal(first.data.game.scores.size, 2);
    assert.equal(emitted.filter(({ event }) => event === 'gameSet').some(({ payload }) => payload.mode === 'pairs-1vs1'), true);
});
