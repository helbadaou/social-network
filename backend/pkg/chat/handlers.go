// chat/handlers.go

package chat

import (
	"encoding/json"
	"strconv"
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
	CanChat      bool   `json:"can_chat"`
}

// Fonction utilitaire pour vérifier si deux utilisateurs peuvent discuter
func canUsersChat(userID1, userID2 int) (bool, error) {
	// Vérifier si user1 suit user2 ET user2 suit user1 (suivi mutuel)
	var count int
	err := sqlite.DB.QueryRow(`
		SELECT COUNT(*) FROM followers 
		WHERE (follower_id = ? AND followed_id = ? AND status = 'accepted')
		AND EXISTS (
			SELECT 1 FROM followers 
			WHERE follower_id = ? AND followed_id = ? AND status = 'accepted'
		)
	`, userID1, userID2, userID2, userID1).Scan(&count)
	if err != nil {
		return false, err
	}

	return count > 0, nil
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

		// Vérifier si les utilisateurs peuvent discuter (suivi mutuel)
		canChat, err := canUsersChat(requesterID, id)
		if err != nil {
			canChat = false // En cas d'erreur, interdire le chat
		}
		user.CanChat = canChat

		users = append(users, user)
	}

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
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
	otherIDStr := r.URL.Query().Get("with")
	if otherIDStr == "" {
		http.Error(w, "Missing 'with' parameter", http.StatusBadRequest)
		return
	}

	otherID, err := strconv.Atoi(otherIDStr)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	// NOUVELLE VÉRIFICATION : Vérifier si les utilisateurs peuvent discuter
	canChat, err := canUsersChat(userID, otherID)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	if !canChat {
		http.Error(w, "Chat not allowed: users must follow each other", http.StatusForbidden)
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
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	if err := json.NewEncoder(w).Encode(messages); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
		return
	}
}
