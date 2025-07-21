// chat/handlers.go

package chat

import (
	"encoding/json"
	"fmt"
	"net/http"
	"social-network/backend/pkg/auth"
	"social-network/backend/pkg/db/sqlite"
	x "social-network/backend/pkg/websocket"
)

type ChatUser struct {
	ID       int    `json:"id"`
	FullName string `json:"full_name"`
	Avatar   string `json:"avatar"`
}

func GetAllChatUsers(w http.ResponseWriter, r *http.Request) {
	rows, err := sqlite.DB.Query(`SELECT id, first_name, last_name, avatar FROM users`)
	if err != nil {
		http.Error(w, "Failed to fetch users", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var users []ChatUser

	for rows.Next() {
		var id int
		var firstName, lastName, avatar string

		if err := rows.Scan(&id, &firstName, &lastName, &avatar); err != nil {
			continue
		}

		fullName := firstName + " " + lastName
		users = append(users, ChatUser{
			ID:       id,
			FullName: fullName,
			Avatar:   avatar,
		})
	}

	if len(users) > 0 {
		fmt.Println("users are", users)
	} else {
		fmt.Println("no users available")
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