function shuffled(values, random = Math.random) {
    const result = [...values];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

const SUDOKU_LEVELS = [
    { level: 1, size: 3, maxValue: 9, boxRows: 3, boxCols: 3, blanks: 3, label: 'Un solo quadrato' },
    { level: 2, size: 4, maxValue: 4, boxRows: 2, boxCols: 2, blanks: 6, label: 'Mini Sudoku 4×4' },
    { level: 3, size: 4, maxValue: 4, boxRows: 2, boxCols: 2, blanks: 8, label: 'Mini Sudoku 4×4' },
    { level: 4, size: 6, maxValue: 6, boxRows: 2, boxCols: 3, blanks: 14, label: 'Sudoku 6×6' },
    { level: 5, size: 6, maxValue: 6, boxRows: 2, boxCols: 3, blanks: 18, label: 'Sudoku 6×6' },
    { level: 6, size: 6, maxValue: 6, boxRows: 2, boxCols: 3, blanks: 22, label: 'Sudoku 6×6' },
    { level: 7, size: 9, maxValue: 9, boxRows: 3, boxCols: 3, blanks: 32, label: 'Sudoku classico' },
    { level: 8, size: 9, maxValue: 9, boxRows: 3, boxCols: 3, blanks: 38, label: 'Sudoku classico' },
    { level: 9, size: 9, maxValue: 9, boxRows: 3, boxCols: 3, blanks: 44, label: 'Sudoku avanzato' },
    { level: 10, size: 9, maxValue: 9, boxRows: 3, boxCols: 3, blanks: 50, label: 'Sudoku BOSS' },
];

function sudokuLevelDefinition(rawLevel) {
    const level = Math.min(10, Math.max(1, Number(rawLevel) || 1));
    return { ...SUDOKU_LEVELS[level - 1] };
}

function createSolution(options = {}, random = Math.random) {
    // Retrocompatibilità: createSolution(random)
    if (typeof options === 'function') {
        random = options;
        options = {};
    }
    const definition = { size: 9, maxValue: 9, boxRows: 3, boxCols: 3, ...options };
    const { size, maxValue, boxRows, boxCols } = definition;

    // Il tutorial 3×3 è un singolo riquadro contenente una volta i numeri 1–9.
    if (size === 3 && maxValue === 9) {
        const values = shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9], random);
        return Array.from({ length: 3 }, (_, row) => values.slice(row * 3, row * 3 + 3));
    }

    const pattern = (row, col) => (boxCols * (row % boxRows) + Math.floor(row / boxRows) + col) % size;
    const rowGroups = shuffled(Array.from({ length: size / boxRows }, (_, index) => index), random);
    const colGroups = shuffled(Array.from({ length: size / boxCols }, (_, index) => index), random);
    const rows = rowGroups.flatMap(group => shuffled(Array.from({ length: boxRows }, (_, index) => group * boxRows + index), random));
    const cols = colGroups.flatMap(group => shuffled(Array.from({ length: boxCols }, (_, index) => group * boxCols + index), random));
    const numbers = shuffled(Array.from({ length: maxValue }, (_, index) => index + 1), random);
    return rows.map(row => cols.map(col => numbers[pattern(row, col)]));
}

function createSudoku(blanksOrOptions = 42, random = Math.random) {
    const definition = typeof blanksOrOptions === 'object'
        ? { ...blanksOrOptions }
        : { level: 7, size: 9, maxValue: 9, boxRows: 3, boxCols: 3, blanks: blanksOrOptions, label: 'Sudoku classico' };
    const solution = createSolution(definition, random);
    const puzzle = solution.map(row => [...row]);
    const cellCount = definition.size * definition.size;
    const blanks = Math.min(cellCount - 1, Math.max(1, Number(definition.blanks) || 1));
    const cells = shuffled(Array.from({ length: cellCount }, (_, index) => index), random);
    cells.slice(0, blanks).forEach(index => {
        puzzle[Math.floor(index / definition.size)][index % definition.size] = 0;
    });
    return { puzzle, solution, definition };
}

function createSudokuForLevel(level, random = Math.random) {
    return createSudoku(sudokuLevelDefinition(level), random);
}

function isComplete(board) {
    return board.every(row => row.every(value => Number.isInteger(value) && value >= 1));
}

module.exports = {
    createSolution, createSudoku, createSudokuForLevel, sudokuLevelDefinition, isComplete, SUDOKU_LEVELS,
};
