-- Schema MySQL per ButtonGame
-- Da importare su Hostinger (phpMyAdmin) se non si vuole affidarsi alla creazione automatica (initDb) al primo avvio.

CREATE TABLE IF NOT EXISTS scores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nickname VARCHAR(64) NOT NULL,
    mode VARCHAR(20) NOT NULL DEFAULT 'campain',
    score INT NOT NULL,
    elapsed_ms INT NOT NULL,
    level INT NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS adventure_progress (
    player_id VARCHAR(64) NOT NULL,
    node_id INT NOT NULL,
    stars TINYINT NOT NULL DEFAULT 1,
    best_score INT NOT NULL DEFAULT 0,
    best_elapsed_ms INT NOT NULL,
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (player_id, node_id)
);
