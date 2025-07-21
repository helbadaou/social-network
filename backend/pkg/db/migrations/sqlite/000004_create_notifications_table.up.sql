CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL,
    receiver_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL, -- 'follow_request', 'message', etc.
    seen BOOLEAN DEFAULT FALSE,
    accepted BOOLEAN DEFAULT NULL, -- NULL = pas encore traité, TRUE/FALSE pour les demandes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (receiver_id) REFERENCES users(id)
);