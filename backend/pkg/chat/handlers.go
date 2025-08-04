// chat/handlers.go

package chat

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	// "fmt"
	"net/http"

	"social-network/backend/pkg/auth"
	"social-network/backend/pkg/db/sqlite"
	"social-network/backend/pkg/models"
	"social-network/backend/pkg/websocket"
	x "social-network/backend/pkg/websocket"
)

var Hub *websocket.Hub

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
	requesterID, ok := auth.GetUserIDFromSession(w, r)
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
	userID, ok := auth.GetUserIDFromSession(w, r)
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

// pkg/chat/handlers.go
func HandleGroupMessage(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserIDFromSession(w, r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	pathParts := strings.Split(r.URL.Path, "/")
	groupIDStr := pathParts[len(pathParts)-2] // .../groups/{id}/messages
	groupID, err := strconv.Atoi(groupIDStr)
	if err != nil {
		http.Error(w, "Invalid group ID", http.StatusBadRequest)
		return
	}

	var requestBody struct {
		Content string `json:"content"`
	}

	if err := json.NewDecoder(r.Body).Decode(&requestBody); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Vérifier si l'utilisateur est membre du groupe avant d'envoyer
	isMember, err := sqlite.IsGroupMember(sqlite.DB, groupID, userID)
	if err != nil {
		http.Error(w, "Database error checking group membership", http.StatusInternalServerError)
		return
	}
	if !isMember {
		http.Error(w, "Not a member of this group", http.StatusForbidden)
		return
	}

	// Insérer le message dans la base de données
	_, err = InsertGroupMessage(sqlite.DB, groupID, userID, requestBody.Content)
	if err != nil {
		fmt.Printf("Error inserting group message into DB: %v\n", err)
		http.Error(w, "Failed to send message", http.StatusInternalServerError)
		return
	}

	// Créer un message WebSocket pour diffusion
	wsMessage := websocket.Message{
		From:      userID,
		GroupID:   groupID, // Important: Utilisez GroupID ici
		Content:   requestBody.Content,
		Type:      "group", // Important: Spécifiez le type "group"
		Timestamp: time.Now().Format(time.RFC3339),
	}

	// Diffuser le message via le Hub WebSocket
	Hub.Broadcast <- wsMessage // Assurez-vous que chat.Hub est initialisé

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Group message sent successfully"})
}

func GetGroupMessagesHandler(w http.ResponseWriter, r *http.Request) {
	userID, _ := auth.GetUserIDFromSession(w, r)
	if userID == 0 {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	groupIDStr := strings.TrimPrefix(r.URL.Path, "/api/groups/")
	groupIDStr = strings.TrimSuffix(groupIDStr, "/messages")
	groupID, err := strconv.Atoi(groupIDStr)
	if err != nil {
		http.Error(w, "Invalid group ID", http.StatusBadRequest)
		return
	}

	// Vérifiez que l'utilisateur est membre du groupe
	isMember, err := sqlite.IsGroupMember(sqlite.DB, groupID, userID)
	if err != nil || !isMember {
		http.Error(w, "Not authorized", http.StatusForbidden)
		return
	}

	rows, err := sqlite.DB.Query(`
        SELECT gm.id, gm.group_id, gm.sender_id, gm.content, gm.timestamp,
               u.first_name || ' ' || u.last_name as sender_name, u.avatar
        FROM group_messages gm
        JOIN users u ON gm.sender_id = u.id
        WHERE gm.group_id = ?
        ORDER BY gm.timestamp ASC
    `, groupID)
	if err != nil {
		http.Error(w, "Failed to fetch messages", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var messages []models.GroupMessage // x = import alias

	for rows.Next() {
		var msg models.GroupMessage
		if err := rows.Scan(
			&msg.ID, &msg.GroupID, &msg.SenderID, &msg.Content, &msg.Timestamp,
			&msg.SenderNickname, &msg.SenderAvatar,
		); err != nil {
			return
		}
		if msg.SenderAvatar != "" {
			msg.SenderAvatar = "http://localhost:8080/" + msg.SenderAvatar
		}
		messages = append(messages, msg)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(messages)
}

func InsertGroupMessage(db *sql.DB, groupID int, senderID int, content string) (int, error) {
	result, err := db.Exec(`
        INSERT INTO group_messages (group_id, sender_id, content, timestamp)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
		groupID, senderID, content)
	if err != nil {
		return 0, err
	}
	id, err := result.LastInsertId()
	if err != nil {
		return 0, err
	}
	return int(id), nil
}
