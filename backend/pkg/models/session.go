package models

import (
    "database/sql"
    "time"
)

type Session struct {
    ID        string    `json:"id"`
    UserID    int       `json:"userId"`
    ExpiresAt time.Time `json:"expiresAt"`
    CreatedAt time.Time `json:"createdAt"`
}

func (s *Session) Create(db *sql.DB) error {
    query := `
        INSERT INTO sessions (id, user_id, expires_at)
        VALUES (?, ?, ?)
    `
    _, err := db.Exec(query, s.ID, s.UserID, s.ExpiresAt)
    return err
}

func (s *Session) GetByID(db *sql.DB, id string) error {
    query := `
        SELECT id, user_id, expires_at, created_at
        FROM sessions 
        WHERE id = ? AND expires_at > CURRENT_TIMESTAMP
    `
    row := db.QueryRow(query, id)
    
    return row.Scan(&s.ID, &s.UserID, &s.ExpiresAt, &s.CreatedAt)
}

func (s *Session) Delete(db *sql.DB) error {
    query := `DELETE FROM sessions WHERE id = ?`
    _, err := db.Exec(query, s.ID)
    return err
}

func DeleteExpiredSessions(db *sql.DB) error {
    query := `DELETE FROM sessions WHERE expires_at <= CURRENT_TIMESTAMP`
    _, err := db.Exec(query)
    return err
}