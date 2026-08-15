const { pool } = require('./db');

async function saveScore({ nickname, mode, score, elapsedMs, level = 1 }) {
    const [result] = await pool.query(
        'INSERT INTO scores (nickname, mode, score, elapsed_ms, level) VALUES (?, ?, ?, ?, ?)',
        [nickname, mode, score, elapsedMs, level]
    );
    return result.insertId;
}

async function getTopScores(limit = 10) {
    const [rows] = await pool.query(
        'SELECT nickname, mode, score, elapsed_ms, level, created_at FROM scores ORDER BY score DESC LIMIT ?',
        [limit]
    );
    return rows;
}

const GAME_MODE_GROUPS = {
    numberBlast: ['campaign-total', 'number-blast-1vs1'],
    pairs: ['pairs', 'campain', 'pairs-1vs1', '1vs1'],
    sudoku: ['sudoku'],
    escapeMath: ['escape-math', 'escape-math-1vs1'],
};

async function getLeaderboardsByGame(limit = 30) {
    const entries = await Promise.all(Object.entries(GAME_MODE_GROUPS).map(async ([game, modes]) => {
        const placeholders = modes.map(() => '?').join(', ');
        const [rows] = await pool.query(
            `SELECT nickname, mode, score, elapsed_ms, level, created_at
             FROM scores WHERE mode IN (${placeholders})
             ORDER BY score DESC, elapsed_ms ASC LIMIT ?`,
            [...modes, limit]
        );
        return [game, rows];
    }));
    return Object.fromEntries(entries);
}

async function updateScoreNickname(id, nickname) {
    const [result] = await pool.query(
        'UPDATE scores SET nickname = ? WHERE id = ?',
        [nickname, id]
    );
    return result.affectedRows === 1;
}

module.exports = { saveScore, getTopScores, getLeaderboardsByGame, updateScoreNickname, GAME_MODE_GROUPS };
