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
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

module.exports = { pool, initDb };