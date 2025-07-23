CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  sender_id INTEGER NOT NULL,
  type TEXT NOT NULL, -- "follow_request", "follow_accept", etc.
  message TEXT,
  seen BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
