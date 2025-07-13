// chat/handlers.go

package chat

import (
	"encoding/json"
	"fmt"
	"net/http"
	"social-network/backend/pkg/db/sqlite"
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
