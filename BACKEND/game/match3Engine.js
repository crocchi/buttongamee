const TILE_TYPES = 6;

function key(row, col) { return `${row}:${col}`; }
function cloneBoard(board) { return board.map(row => row.map(cell => ({ ...cell }))); }

function createsMatch(board, row, col, value) {
    return (col >= 2 && board[row][col - 1]?.value === value && board[row][col - 2]?.value === value)
        || (row >= 2 && board[row - 1]?.[col]?.value === value && board[row - 2]?.[col]?.value === value);
}

function createBoard(size, random = Math.random) {
    let board;
    for (let attempt = 0; attempt < 100; attempt++) {
        board = Array.from({ length: size }, () => Array(size));
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                let value;
                do { value = 1 + Math.floor(random() * TILE_TYPES); }
                while (createsMatch(board, row, col, value));
                board[row][col] = { value, special: null };
            }
        }
        if (hasPossibleMove(board)) return board;
    }
    return board;
}

function findMatchGroups(board) {
    const groups = [];
    const size = board.length;
    for (let row = 0; row < size; row++) {
        let start = 0;
        for (let col = 1; col <= size; col++) {
            if (col < size && board[row][col]?.value === board[row][start]?.value) continue;
            if (board[row][start] && col - start >= 3) {
                groups.push(Array.from({ length: col - start }, (_, i) => ({ row, col: start + i })));
            }
            start = col;
        }
    }
    for (let col = 0; col < size; col++) {
        let start = 0;
        for (let row = 1; row <= size; row++) {
            if (row < size && board[row]?.[col]?.value === board[start]?.[col]?.value) continue;
            if (board[start]?.[col] && row - start >= 3) {
                groups.push(Array.from({ length: row - start }, (_, i) => ({ row: start + i, col })));
            }
            start = row;
        }
    }
    return groups;
}

function areAdjacent(a, b, size) {
    return [a, b].every(p => Number.isInteger(p?.row) && Number.isInteger(p?.col)
        && p.row >= 0 && p.col >= 0 && p.row < size && p.col < size)
        && Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
}

function hasPossibleMove(board) {
    const size = board.length;
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            for (const [dr, dc] of [[0, 1], [1, 0]]) {
                const nextRow = row + dr;
                const nextCol = col + dc;
                if (nextRow >= size || nextCol >= size) continue;
                [board[row][col], board[nextRow][nextCol]] = [board[nextRow][nextCol], board[row][col]];
                const valid = findMatchGroups(board).length > 0;
                [board[row][col], board[nextRow][nextCol]] = [board[nextRow][nextCol], board[row][col]];
                if (valid) return true;
            }
        }
    }
    return false;
}

function expandSpecials(board, cleared) {
    const queue = Array.from(cleared);
    while (queue.length) {
        const current = queue.shift();
        const [row, col] = current.split(':').map(Number);
        const cell = board[row]?.[col];
        if (!cell?.special) continue;
        const additions = [];
        if (cell.special === 'row') {
            for (let c = 0; c < board.length; c++) additions.push(key(row, c));
        } else if (cell.special === 'col') {
            for (let r = 0; r < board.length; r++) additions.push(key(r, col));
        } else if (cell.special === 'bomb') {
            board.forEach((line, r) => line.forEach((tile, c) => {
                if (tile?.value === cell.value) additions.push(key(r, c));
            }));
        }
        additions.forEach(item => {
            if (!cleared.has(item)) { cleared.add(item); queue.push(item); }
        });
    }
}

function collapse(board, random = Math.random) {
    const size = board.length;
    for (let col = 0; col < size; col++) {
        const remaining = [];
        for (let row = size - 1; row >= 0; row--) if (board[row][col]) remaining.push(board[row][col]);
        for (let row = size - 1, i = 0; row >= 0; row--, i++) {
            board[row][col] = remaining[i] || { value: 1 + Math.floor(random() * TILE_TYPES), special: null };
        }
    }
}

function resolveBoard(board, preferred, random = Math.random) {
    let score = 0;
    let cascade = 0;
    const steps = [];
    while (cascade < 12) {
        const groups = findMatchGroups(board);
        if (!groups.length) break;
        cascade += 1;
        const cleared = new Set(groups.flat().map(({ row, col }) => key(row, col)));
        let specialAt = null;
        const specialGroup = groups.sort((a, b) => b.length - a.length).find(group => group.length >= 4);
        if (specialGroup) {
            const anchor = specialGroup.find(p => preferred && p.row === preferred.row && p.col === preferred.col) || specialGroup[0];
            specialAt = key(anchor.row, anchor.col);
            const horizontal = specialGroup.every(p => p.row === specialGroup[0].row);
            board[anchor.row][anchor.col].special = specialGroup.length >= 5 ? 'bomb' : (horizontal ? 'row' : 'col');
            cleared.delete(specialAt);
        }
        expandSpecials(board, cleared);
        const before = cloneBoard(board);
        score += cleared.size * 10 * cascade;
        cleared.forEach(item => {
            const [row, col] = item.split(':').map(Number);
            board[row][col] = null;
        });
        collapse(board, random);
        steps.push({
            cleared: Array.from(cleared), cascade, specialAt,
            before, after: cloneBoard(board),
        });
        preferred = null;
    }
    return { score, steps };
}

function makeMove(source, from, to, random = Math.random) {
    const board = cloneBoard(source);
    if (!areAdjacent(from, to, board.length)) return { valid: false, board: source, score: 0, steps: [] };
    [board[from.row][from.col], board[to.row][to.col]] = [board[to.row][to.col], board[from.row][from.col]];
    if (!findMatchGroups(board).length) return { valid: false, board: source, score: 0, steps: [] };
    const result = resolveBoard(board, to, random);
    return { valid: true, board, ...result };
}

function levelDefinition(level) {
    const safeLevel = Math.min(10, Math.max(1, Number(level) || 1));
    return {
        level: safeLevel,
        size: safeLevel <= 3 ? 6 : (safeLevel <= 7 ? 7 : 8),
        moves: 18 + Math.floor((safeLevel - 1) / 3) * 2,
        targetScore: 250 + safeLevel * 150,
    };
}

module.exports = { createBoard, findMatchGroups, makeMove, levelDefinition, areAdjacent, hasPossibleMove };
