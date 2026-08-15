const test = require('node:test');
const assert = require('node:assert/strict');
const { createBoard, findMatchGroups, makeMove, levelDefinition, areAdjacent, hasPossibleMove } = require('../game/match3Engine');

test('la griglia iniziale non contiene combinazioni automatiche', () => {
    for (const size of [6, 7, 8]) {
        const board = createBoard(size);
        assert.equal(board.length, size);
        assert.equal(findMatchGroups(board).length, 0);
        assert.equal(hasPossibleMove(board), true);
    }
});

test('sono ammessi soltanto scambi adiacenti dentro la griglia', () => {
    assert.equal(areAdjacent({ row: 0, col: 0 }, { row: 0, col: 1 }, 6), true);
    assert.equal(areAdjacent({ row: 0, col: 0 }, { row: 1, col: 1 }, 6), false);
    assert.equal(areAdjacent({ row: -1, col: 0 }, { row: 0, col: 0 }, 6), false);
});

test('uno scambio senza combinazione viene annullato', () => {
    const cell = value => ({ value, special: null });
    const board = [
        [cell(1), cell(2), cell(3)],
        [cell(4), cell(5), cell(6)],
        [cell(2), cell(3), cell(4)],
    ];
    const result = makeMove(board, { row: 0, col: 0 }, { row: 0, col: 1 });
    assert.equal(result.valid, false);
    assert.equal(result.board, board);
});

test('uno scambio valido elimina la combinazione e assegna punti', () => {
    const cell = value => ({ value, special: null });
    const board = [
        [cell(1), cell(2), cell(1)],
        [cell(2), cell(1), cell(3)],
        [cell(4), cell(1), cell(5)],
    ];
    const values = [0, .2, .4, .6, .8, .99];
    let index = 0;
    const result = makeMove(board, { row: 0, col: 1 }, { row: 1, col: 1 }, () => values[index++ % values.length]);
    assert.equal(result.valid, true);
    assert.ok(result.score >= 30);
    assert.ok(result.steps.length >= 1);
    assert.equal(Array.isArray(result.steps[0].before), true);
    assert.equal(Array.isArray(result.steps[0].after), true);
    assert.ok(result.steps[0].cleared.length >= 3);
    assert.equal(result.board.every(row => row.every(Boolean)), true);
});

test('i primi dieci livelli aumentano dimensione, obiettivo e mosse', () => {
    assert.equal(levelDefinition(1).size, 6);
    assert.equal(levelDefinition(4).size, 7);
    assert.equal(levelDefinition(8).size, 8);
    assert.ok(levelDefinition(10).targetScore > levelDefinition(1).targetScore);
    assert.ok(levelDefinition(10).moves > levelDefinition(1).moves);
});
