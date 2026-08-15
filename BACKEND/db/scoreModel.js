const { pool } = require('./db');

async function saveScore({ nickname, mode, score, elapsedMs }) {
    const [result] = await pool.query(
        'INSERT INTO scores (nickname, mode, score, elapsed_ms) VALUES (?, ?, ?, ?)',
        [nickname, mode, score, elapsedMs]
    );
    return result.insertId;
}

async function getTopScores(limit = 10) {
    const [rows] = await pool.query(
        'SELECT nickname, mode, score, elapsed_ms, created_at FROM scores ORDER BY score DESC LIMIT ?',
        [limit]
    );
    return rows;
}

module.exports = { saveScore, getTopScores };
