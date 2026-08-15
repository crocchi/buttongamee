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
    assert.equal(socket.data.game.puzzle.length, 12);
});

test('il punteggio della campagna viene calcolato dal server', () => {
    const { socket, handlers } = makeHarness();
    handlers.gameStart.call(socket, 1);

    const puzzle = socket.data.game.puzzle;
    const first = puzzle.findIndex(value => value !== 'point' && value !== 'bomb');
    const second = puzzle.findIndex((value, index) => index !== first && value === puzzle[first]);

    handlers.gameClick.call(socket, { index: first });
    handlers.gameClick.call(socket, { index: second });

    assert.equal(socket.data.game.levelScore, 10);
    assert.deepEqual([...socket.data.game.matched].sort((a, b) => a - b), [first, second].sort((a, b) => a - b));
});

test('due richieste 1vs1 dello stesso socket non lo abbinano con sé stesso', () => {
    const { socket, handlers, rooms } = makeHarness('solo-player');
    handlers.gameOnline1vs1.call(socket, 'join');
    handlers.gameOnline1vs1.call(socket, 'join');

    assert.equal(rooms.length, 0);
    assert.equal(socket.data.game, undefined);
});
