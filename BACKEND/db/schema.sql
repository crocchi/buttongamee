-- Schema MySQL per ButtonGame
-- Da importare su Hostinger (phpMyAdmin) se non si vuole affidarsi alla creazione automatica (initDb) al primo avvio.

CREATE TABLE IF NOT EXISTS scores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nickname VARCHAR(64) NOT NULL,
    mode VARCHAR(20) NOT NULL DEFAULT 'campain',
    score INT NOT NULL,
    elapsed_ms INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
