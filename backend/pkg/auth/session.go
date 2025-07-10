package auth

import (
	"net/http"
	"strconv"
)

// GetUserIDFromSession récupère l'ID utilisateur à partir du cookie "session_id"
func GetUserIDFromSession(r *http.Request) (int, bool) {
	cookie, err := r.Cookie("session_id")
	if err != nil {
		return 0, false
	}

	userID, err := strconv.Atoi(cookie.Value)
	if err != nil {
		return 0, false
	}

	return userID, true
}
