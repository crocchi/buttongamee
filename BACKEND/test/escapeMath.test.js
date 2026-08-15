const test = require('node:test');
const assert = require('node:assert/strict');
const { createEscapePuzzle, puzzleTypeForLevel } = require('../game/escapeMathEngine');

test('Escape Math distribuisce i tipi di enigma sui 100 livelli', () => {
    assert.equal(puzzleTypeForLevel(1), 'add-sub');
    assert.equal(puzzleTypeForLevel(11), 'mult-div');
    assert.equal(puzzleTypeForLevel(21), 'sequence');
    assert.equal(puzzleTypeForLevel(41), 'target');
    assert.equal(puzzleTypeForLevel(61), 'expression');
    assert.equal(puzzleTypeForLevel(100), 'add-sub');
});

test('ogni stanza contiene quattro risposte e una sola soluzione valida', () => {
    for (let level = 1; level <= 100; level++) {
        const puzzle = createEscapePuzzle(level);
        assert.equal(puzzle.choices.length, 4);
        assert.equal(new Set(puzzle.choices).size, 4);
        assert.equal(puzzle.choices.filter(choice => choice === puzzle.answer).length, 1);
        assert.equal(puzzle.timeLimitMs >= 10000, true);
        assert.equal(puzzle.boss, level % 10 === 0);
    }
});

test('le divisioni generate hanno sempre una soluzione intera', () => {
    for (let i = 0; i < 50; i++) {
        const puzzle = createEscapePuzzle(18);
        assert.equal(Number.isInteger(puzzle.answer), true);
    }
});
