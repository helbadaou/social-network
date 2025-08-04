// profile/handlers.go

package profile

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"social-network/backend/pkg/auth"
	"social-network/backend/pkg/db/sqlite"
	"social-network/backend/pkg/models"
	// "fmt"
)

func ProfileHandler(w http.ResponseWriter, r *http.Request) {
	id, ok := auth.GetUserIDFromSession(w, r)
	if !ok {
		fmt.Println("Error getting session cookie:", ok)
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	userID := id

	var user models.User

	query := `SELECT id, email, first_name, last_name, date_of_birth, nickname, about, avatar, is_private FROM users WHERE id = ?`

	err := sqlite.DB.QueryRow(query, userID).Scan(
		&user.ID, &user.Email, &user.FirstName, &user.LastName,
		&user.DateOfBirth, &user.Nickname, &user.About, &user.Avatar, &user.IsPrivate)
	if err != nil {
		fmt.Println("Error fetching user profile 1:", err)
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json; charset=utf-8")

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
		IsOwner     bool   `json:"is_owner"`
		IsFollowed  bool   `json:"is_followed"`
	}

	row := db.QueryRow(`
		SELECT id, first_name, last_name, nickname, email, about, avatar, date_of_birth, is_private
		FROM users
		WHERE id = ?
	`, id)
	err = row.Scan(
		&user.ID, &user.FirstName, &user.LastName, &user.Nickname,
		&user.Email, &user.About, &user.Avatar, &user.DateOfBirth, &user.IsPrivate,
	)
	if err != nil {
		fmt.Println("Error fetching user:", err)
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	// Détermine si c'est son propre profil
	user.IsOwner = (requesterID == user.ID)

	// Vérifie si l'utilisateur connecté suit ce profil (si ce n'est pas lui-même)
	if !user.IsOwner {
		var status string
		err := db.QueryRow(`
			SELECT status FROM followers
			WHERE follower_id = ? AND followed_id = ?
		`, requesterID, user.ID).Scan(&status)
		if err == nil && status == "accepted" {
			user.IsFollowed = true
		}
	}

	// Si le profil est privé et que l'utilisateur n'est ni le propriétaire ni un abonné, ne retourne que les infos publiques
	if user.IsPrivate && !user.IsOwner && !user.IsFollowed {
		user.FirstName = ""
		user.LastName = ""
		user.Nickname = ""
		user.About = ""
		user.Email = ""
		user.About = ""
		user.DateOfBirth = ""
		// Tu peux masquer d'autres champs si besoin
	}

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	json.NewEncoder(w).Encode(user)
}
