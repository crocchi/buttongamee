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

async function updateScoreNickname(id, nickname) {
    const [result] = await pool.query(
        'UPDATE scores SET nickname = ? WHERE id = ?',
        [nickname, id]
    );
    return result.affectedRows === 1;
}

module.exports = { saveScore, getTopScores, updateScoreNickname };
