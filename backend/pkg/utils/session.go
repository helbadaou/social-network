package utils

import (
    "database/sql"
    "net/http"
    "time"
    "social-network/pkg/models"
    
    "github.com/google/uuid"
)

func CreateSession(db *sql.DB, userID int) (*models.Session, error) {
    session := &models.Session{
        ID:        uuid.New().String(),
        UserID:    userID,
        ExpiresAt: time.Now().Add(24 * time.Hour), // 24 hours
    }
    
    err := session.Create(db)
    if err != nil {
        return nil, err
    }
    
    return session, nil
}

func SetSessionCookie(w http.ResponseWriter, sessionID string) {
    cookie := &http.Cookie{
        Name:     "session_token",
        Value:    sessionID,
        Path:     "/",
        MaxAge:   24 * 60 * 60, // 24 hours
        HttpOnly: true,
        Secure:   false, // Set to true in production with HTTPS
        SameSite: http.SameSiteLaxMode,
    }
    
    http.SetCookie(w, cookie)
}

func ClearSessionCookie(w http.ResponseWriter) {
    cookie := &http.Cookie{
        Name:     "session_token",
        Value:    "",
        Path:     "/",
        MaxAge:   -1,
        HttpOnly: true,
        Secure:   false,
        SameSite: http.SameSiteLaxMode,
    }
    
    http.SetCookie(w, cookie)
}