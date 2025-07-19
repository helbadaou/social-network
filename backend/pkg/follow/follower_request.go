package follow

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"social-network/backend/pkg/auth"
	"social-network/backend/pkg/db/sqlite"
)

func GetFollowersHandler(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 4 {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}
	userID, err := strconv.Atoi(parts[3])
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	rows, err := sqlite.DB.Query(`
		SELECT users.id, users.first_name, users.last_name, users.nickname, users.avatar
		FROM followers
		JOIN users ON users.id = followers.follower_id
		WHERE followers.followed_id = ? AND followers.status = 'accepted'
	`, userID)
	if err != nil {
		http.Error(w, "DB error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var followers []map[string]interface{}
	for rows.Next() {
		var id int
		var firstName, lastName, nickname, avatar string
		if err := rows.Scan(&id, &firstName, &lastName, &nickname, &avatar); err == nil {
			followers = append(followers, map[string]interface{}{
				"id":         id,
				"first_name": firstName,
				"last_name":  lastName,
				"nickname":   nickname,
				"avatar":     avatar,
			})
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(followers)
}

func GetFollowingHandler(w http.ResponseWriter, r *http.Request) {
	// Exemple d'URL : /api/users-following/12
	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 3 {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	// Récupération de l'ID utilisateur depuis l'URL
	userIDStr := parts[len(parts)-1]
	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	// Requête SQL pour récupérer les infos des utilisateurs suivis
	query := `
		SELECT u.id, u.nickname, u.first_name, u.last_name, u.avatar
		FROM followers f
		JOIN users u ON f.followed_id = u.id
		WHERE f.follower_id = ? AND f.status = 'accepted'
	`
	rows, err := sqlite.DB.Query(query, userID)
	if err != nil {
		http.Error(w, "DB error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type User struct {
		ID        int    `json:"id"`
		Nickname  string `json:"nickname"`
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
		Avatar    string `json:"avatar"`
	}

	var following []User
	for rows.Next() {
		var u User
		if err := rows.Scan(&u.ID, &u.Nickname, &u.FirstName, &u.LastName, &u.Avatar); err != nil {
			continue
		}
		following = append(following, u)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(following)
}

func GetRecipientsHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserIDFromSession(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	recipients, err := sqlite.GetAcceptedFollowers(userID)
	if err != nil {
		http.Error(w, "Failed to fetch recipients", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(recipients)
}