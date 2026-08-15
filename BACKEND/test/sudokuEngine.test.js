const test = require('node:test');
const assert = require('node:assert/strict');
const { createSolution, createSudoku, isComplete } = require('../game/sudokuEngine');

function validSet(values) {
    return [...values].sort((a, b) => a - b).join('') === '123456789';
}

test('la soluzione Sudoku rispetta righe, colonne e riquadri 3x3', () => {
    const solution = createSolution();
    solution.forEach(row => assert.equal(validSet(row), true));
    for (let col = 0; col < 9; col++) assert.equal(validSet(solution.map(row => row[col])), true);
    for (let boxRow = 0; boxRow < 3; boxRow++) {
        for (let boxCol = 0; boxCol < 3; boxCol++) {
            const values = [];
            for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
                values.push(solution[boxRow * 3 + row][boxCol * 3 + col]);
            }
            assert.equal(validSet(values), true);
        }
    }
});

test('il puzzle medio contiene 42 caselle vuote e conserva la soluzione', () => {
    const { puzzle, solution } = createSudoku(42);
    assert.equal(puzzle.flat().filter(value => value === 0).length, 42);
    puzzle.forEach((row, r) => row.forEach((value, c) => {
        if (value) assert.equal(value, solution[r][c]);
    }));
    assert.equal(isComplete(puzzle), false);
    assert.equal(isComplete(solution), true);
});
