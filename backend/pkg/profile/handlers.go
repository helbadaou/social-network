// profile/handlers.go

package profile

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"social-network/backend/pkg/db/sqlite"
	"social-network/backend/pkg/models"
	// "fmt"
)

func ProfileHandler(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("session_id")
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	userID := cookie.Value

	var user models.User

	query := `SELECT id, email, first_name, last_name, date_of_birth, nickname, about, avatar, is_private FROM users WHERE id = ?`

	err = sqlite.DB.QueryRow(query, userID).Scan(
		&user.ID, &user.Email, &user.FirstName, &user.LastName,
		&user.DateOfBirth, &user.Nickname, &user.About, &user.Avatar, &user.IsPrivate)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	json.NewEncoder(w).Encode(user)
}

func GetUserByIDHandler(w http.ResponseWriter, r *http.Request) {
	idStr := strings.TrimPrefix(r.URL.Path, "/api/users/")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	// Get requester ID from session
	cookie, err := r.Cookie("session_id")
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	requesterID, err := strconv.Atoi(cookie.Value)
	if err != nil {
		http.Error(w, "Invalid session ID", http.StatusBadRequest)
		return
	}

	db := sqlite.GetDB()
	var user struct {
		ID          int    `json:"id"`
		FirstName   string `json:"first_name"`
		LastName    string `json:"last_name"`
		Nickname    string `json:"nickname"`
		Email       string `json:"email"`
		About       string `json:"about"`
		Avatar      string `json:"avatar"`
		DateOfBirth string `json:"date_of_birth"`
		IsPrivate   bool   `json:"is_private"`
	}

	row := db.QueryRow(`SELECT id, first_name, last_name, nickname, email, about, avatar, date_of_birth, is_private FROM users WHERE id = ?`, id)
	err = row.Scan(&user.ID, &user.FirstName, &user.LastName, &user.Nickname, &user.Email, &user.About, &user.Avatar, &user.DateOfBirth, &user.IsPrivate)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	// Access control for private profiles
	restricted := false
	if user.IsPrivate && requesterID != user.ID {
		var status string
		err := db.QueryRow(`
        SELECT status FROM followers
        WHERE follower_id = ? AND followed_id = ?
    `, requesterID, user.ID).Scan(&status)
		if err != nil || status != "accepted" {
			restricted = true
		}
	}

	w.Header().Set("Content-Type", "application/json")
	if restricted {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"id":         user.ID,
			"nickname":   user.Nickname,
			"avatar":     user.Avatar,
			"is_private": true,
			"restricted": true,
		})
		return
	}

	json.NewEncoder(w).Encode(user)
}
