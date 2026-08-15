const { pool } = require('./db');

async function getAdventureProgress(playerId) {
    const [rows] = await pool.query(
        `SELECT node_id, stars, best_score, best_elapsed_ms, completed_at
         FROM adventure_progress WHERE player_id = ? ORDER BY node_id`,
        [playerId]
    );
    return rows;
}

async function isAdventureNodeUnlocked(playerId, nodeId) {
    if (nodeId === 1) return true;
    const [rows] = await pool.query(
        'SELECT 1 FROM adventure_progress WHERE player_id = ? AND node_id = ? LIMIT 1',
        [playerId, nodeId - 1]
    );
    return rows.length > 0;
}

async function saveAdventureProgress({ playerId, nodeId, stars, score, elapsedMs }) {
    await pool.query(
        `INSERT INTO adventure_progress
            (player_id, node_id, stars, best_score, best_elapsed_ms)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            stars = GREATEST(stars, VALUES(stars)),
            best_score = GREATEST(best_score, VALUES(best_score)),
            best_elapsed_ms = LEAST(best_elapsed_ms, VALUES(best_elapsed_ms)),
            completed_at = CURRENT_TIMESTAMP`,
        [playerId, nodeId, stars, score, elapsedMs]
    );
    return getAdventureProgress(playerId);
}

module.exports = { getAdventureProgress, isAdventureNodeUnlocked, saveAdventureProgress };
