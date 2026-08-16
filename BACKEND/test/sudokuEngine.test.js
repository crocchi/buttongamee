const test = require('node:test');
const assert = require('node:assert/strict');
const {
    createSolution, createSudoku, createSudokuForLevel, sudokuLevelDefinition, isComplete,
} = require('../game/sudokuEngine');

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

test('il livello 1 usa un solo quadrato 3x3 con tre caselle vuote', () => {
    const { puzzle, solution, definition } = createSudokuForLevel(1);
    assert.equal(definition.size, 3);
    assert.equal(definition.maxValue, 9);
    assert.equal(puzzle.length, 3);
    assert.equal(puzzle.flat().filter(value => value === 0).length, 3);
    assert.deepEqual([...solution.flat()].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
});

test('la progressione Sudoku passa da 3x3 a 4x4, 6x6 e 9x9', () => {
    assert.deepEqual([1, 2, 4, 7, 10].map(level => sudokuLevelDefinition(level).size), [3, 4, 6, 9, 9]);
    for (const level of [2, 4, 7, 10]) {
        const { solution, definition } = createSudokuForLevel(level);
        const expected = Array.from({ length: definition.maxValue }, (_, index) => index + 1).join('');
        solution.forEach(row => assert.equal([...row].sort((a, b) => a - b).join(''), expected));
        for (let col = 0; col < definition.size; col++) {
            assert.equal(solution.map(row => row[col]).sort((a, b) => a - b).join(''), expected);
        }
    }
});
