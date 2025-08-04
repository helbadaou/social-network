package auth

import (
	"database/sql"
	"fmt"
	"net/http"
	"time"

	"social-network/backend/pkg/db/sqlite"
)
func GetUserIDFromSession(w http.ResponseWriter, r *http.Request) (int, bool) {
	id, err := ValidateSession(r, sqlite.DB)
	if err != nil {
		fmt.Println("Error validating session:", err)
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return 0, false
	}
	w.WriteHeader(http.StatusOK)
	return id, true
}
func ValidateSession(r *http.Request, db *sql.DB) (int, error) {
	cookie, err := r.Cookie("session_id")
	if err != nil {
		if err == http.ErrNoCookie {
			fmt.Println("ysf", err)
			return 0, fmt.Errorf("no session cookie")
		}
		return 0, fmt.Errorf("error reading session cookie: %v", err)
	}
	sessionID := cookie.Value
	var userID int
	var expiresAt time.Time
	query := `SELECT userId, expiresAt FROM sessions WHERE id = ?`
	err = db.QueryRow(query, sessionID).Scan(&userID, &expiresAt)
	if err != nil {
		fmt.Println("Error querying session:", err)
		return 0, fmt.Errorf("session not found: %v", err)
	}
	if time.Now().After(expiresAt) {
		return 0, fmt.Errorf("session expired")
	}
	return userID, nil
}