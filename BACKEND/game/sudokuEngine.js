function shuffled(values, random = Math.random) {
    const result = [...values];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

function createSolution(random = Math.random) {
    const base = 3;
    const side = 9;
    const pattern = (row, col) => (base * (row % base) + Math.floor(row / base) + col) % side;
    const rows = shuffled([0, 1, 2], random).flatMap(group => shuffled([0, 1, 2], random).map(row => group * base + row));
    const cols = shuffled([0, 1, 2], random).flatMap(group => shuffled([0, 1, 2], random).map(col => group * base + col));
    const numbers = shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9], random);
    return rows.map(row => cols.map(col => numbers[pattern(row, col)]));
}

function createSudoku(blanks = 42, random = Math.random) {
    const solution = createSolution(random);
    const puzzle = solution.map(row => [...row]);
    const cells = shuffled(Array.from({ length: 81 }, (_, index) => index), random);
    cells.slice(0, Math.min(60, Math.max(20, blanks))).forEach(index => {
        puzzle[Math.floor(index / 9)][index % 9] = 0;
    });
    return { puzzle, solution };
}

function isComplete(board) {
    return board.every(row => row.every(value => Number.isInteger(value) && value >= 1 && value <= 9));
}

module.exports = { createSolution, createSudoku, isComplete };
