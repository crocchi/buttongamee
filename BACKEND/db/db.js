require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
});

// crea le tabelle necessarie se non esistono già
async function initDb() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS scores (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nickname VARCHAR(64) NOT NULL,
            mode VARCHAR(20) NOT NULL DEFAULT 'campain',
            score INT NOT NULL,
            elapsed_ms INT NOT NULL,
            level INT NOT NULL DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // aggiunge la colonna "level" alle tabelle create prima di questa modifica
    try {
        await pool.query('ALTER TABLE scores ADD COLUMN level INT NOT NULL DEFAULT 1');
    } catch (e) {
        if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    }

    await pool.query(`
        CREATE TABLE IF NOT EXISTS adventure_progress (
            player_id VARCHAR(64) NOT NULL,
            node_id INT NOT NULL,
            stars TINYINT NOT NULL DEFAULT 1,
            best_score INT NOT NULL DEFAULT 0,
            best_elapsed_ms INT NOT NULL,
            completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (player_id, node_id)
        )
    `);
}

module.exports = { pool, initDb };
