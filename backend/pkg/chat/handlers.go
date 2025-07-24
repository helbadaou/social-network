// chat/handlers.go

package chat

import (
	"encoding/json"
	// "fmt"
	"net/http"

	"social-network/backend/pkg/auth"
	"social-network/backend/pkg/db/sqlite"
	x "social-network/backend/pkg/websocket"
)

type ChatUser struct {
	ID           int    `json:"id"`
	FullName     string `json:"full_name"`
	Avatar       string `json:"avatar"`
	IsPrivate    bool   `json:"is_private"`
	FollowStatus string `json:"follow_status"`
}

func GetAllChatUsers(w http.ResponseWriter, r *http.Request) {
	requesterID, ok := auth.GetUserIDFromSession(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	rows, err := sqlite.DB.Query(`SELECT id, first_name, last_name, avatar, is_private FROM users`)
	if err != nil {
		http.Error(w, "Failed to fetch users", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var users []ChatUser

	for rows.Next() {
		var id int
		var firstName, lastName, avatar string
		var isPrivate bool

		if err := rows.Scan(&id, &firstName, &lastName, &avatar, &isPrivate); err != nil {
			continue
		}

		fullName := firstName + " " + lastName
		user := ChatUser{
			ID:        id,
			FullName:  fullName,
			Avatar:    avatar,
			IsPrivate: isPrivate,
		}

		// Récupérer le follow_status si ce n'est pas soi-même
		if id != requesterID {
			var status string
			err := sqlite.DB.QueryRow(`SELECT status FROM followers WHERE follower_id = ? AND followed_id = ?`, requesterID, id).Scan(&status)
			if err == nil {
				user.FollowStatus = status
			} else {
				user.FollowStatus = ""
			}
		}

		users = append(users, user)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}

func GetChatHistory(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	userID, ok := auth.GetUserIDFromSession(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	otherID := r.URL.Query().Get("with")
	if otherID == "" {
		http.Error(w, "Missing 'with' parameter", http.StatusBadRequest)
		return
	}
	rows, err := sqlite.DB.Query(`
        SELECT from_id, to_id, content, type, timestamp
        FROM messages
        WHERE (from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?)
        ORDER BY timestamp ASC
    `, userID, otherID, otherID, userID)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	defer rows.Close()
	var messages []x.Message
	for rows.Next() {
		var msg x.Message
		err := rows.Scan(&msg.From, &msg.To, &msg.Content, &msg.Type, &msg.Timestamp)
		if err != nil {
			continue
		}
		messages = append(messages, msg)
	}
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(messages); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
		return
	}
}
