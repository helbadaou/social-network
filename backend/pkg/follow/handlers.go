package follow

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"social-network/backend/pkg/auth"
	"social-network/backend/pkg/db/sqlite"
	"social-network/backend/pkg/notifications"
	"social-network/backend/pkg/websocket"
)

var Hub *websocket.Hub

type FollowRequest struct {
	FollowerID int `json:"follower_id"` // current user (sender)
	FollowedID int `json:"followed_id"` // target user
}

func SendFollowRequest(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	cookie, err := r.Cookie("session_id")
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	followerIDStr := cookie.Value
	followerID, err := strconv.Atoi(followerIDStr)
	if err != nil {
		http.Error(w, "Invalid session ID", http.StatusBadRequest)
		return
	}

	var req struct {
		FollowedID int `json:"followed_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON body", http.StatusBadRequest)
		return
	}

	// Vérifie s’il existe déjà une relation
	var exists int
	err = sqlite.DB.QueryRow(`
		SELECT COUNT(*) FROM followers
		WHERE follower_id = ? AND followed_id = ?
	`, followerID, req.FollowedID).Scan(&exists)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	if exists > 0 {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		json.NewEncoder(w).Encode(map[string]string{
			"status": "already_following",
		})
		return
	}

	// Vérifie si le profil suivi est privé
	var isPrivate bool
	err = sqlite.DB.QueryRow(`
	SELECT is_private FROM users WHERE id = ?
`, req.FollowedID).Scan(&isPrivate)
	if err != nil {
		http.Error(w, "Followed user not found", http.StatusNotFound)
		return
	}

	status := "pending"
	if !isPrivate {
		status = "accepted"
	}

	// Insertion dans la table followers
	_, err = sqlite.DB.Exec(`
	INSERT INTO followers (follower_id, followed_id, status)
	VALUES (?, ?, ?)`, followerID, req.FollowedID, status)
	if err != nil {
		http.Error(w, "Failed to insert follow", http.StatusInternalServerError)
		return
	}

	// 🔔 Envoie d'une notification WebSocket si profil privé
	// var senderUsername string
	// err = sqlite.DB.QueryRow(`SELECT username FROM users WHERE id = ?`, followerID).Scan(&senderUsername)
	// if err != nil {
	// 	senderUsername = "Un utilisateur"
	// }

	if isPrivate && Hub != nil {
		var senderFirstName, senderLastName string
		err := sqlite.DB.QueryRow(`
		SELECT first_name, last_name FROM users WHERE id = ?
	`, followerID).Scan(&senderFirstName, &senderLastName)

		senderName := "Un utilisateur"
		if err == nil {
			senderName = fmt.Sprintf("%s %s", senderFirstName, senderLastName)
		} else {
			fmt.Println("Erreur récupération nom de l'expéditeur :", err)
		}

		message := fmt.Sprintf("%s vous a envoyé une demande d’abonnement", senderName)

		// 🔴 Enregistrer dans la base
		go func() {
			err := notifications.CreateNotification(req.FollowedID, followerID, "follow_request", message)
			if err != nil {
				fmt.Println("Erreur création notification :", err)
			}
		}()

		// 🔴 Envoyer en WebSocket
		go Hub.SendNotification(websocket.Notification{
			SenderID:       followerID,
			SenderNickname: senderName,
			Type:           "notification", // <-- use a generic type
			Message:        message,
			Seen:           false,
			CreatedAt:      "now", // Utiliser le format approprié si nécessaire
		}, req.FollowedID)
	}

	w.WriteHeader(http.StatusCreated)
	fmt.Fprint(w, "Follow request sent")
}

func GetFollowStatus(w http.ResponseWriter, r *http.Request) {
	userIDStr := strings.TrimPrefix(r.URL.Path, "/api/follow/status/")
	followedID, err := strconv.Atoi(userIDStr)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	cookie, err := r.Cookie("session_id")
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	followerID := cookie.Value

	var status string
	err = sqlite.DB.QueryRow(`
		SELECT status FROM followers WHERE follower_id = ? AND followed_id = ?
	`, followerID, followedID).Scan(&status)

	if err == sql.ErrNoRows {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		json.NewEncoder(w).Encode(map[string]string{
			"status": "",
		})
		return
	} else if err != nil {
		http.Error(w, "DB error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	json.NewEncoder(w).Encode(map[string]string{
		"status": status,
	})
}

func UnfollowUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != "DELETE" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	cookie, err := r.Cookie("session_id")
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	followerID, err := strconv.Atoi(cookie.Value)
	if err != nil {
		http.Error(w, "Invalid session ID", http.StatusBadRequest)
		return
	}

	var req struct {
		FollowedID int `json:"followed_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}

	_, err = sqlite.DB.Exec(`
		DELETE FROM followers 
		WHERE follower_id = ? AND followed_id = ?
	`, followerID, req.FollowedID)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Unfollowed successfully"))
}

func AcceptFollowHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := auth.GetUserIDFromSession(w, r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req struct {
		SenderID int `json:"sender_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// On met à jour la ligne dans la table followers
	_, err := sqlite.DB.Exec(`
		UPDATE followers SET status = 'accepted'
		WHERE follower_id = ? AND followed_id = ?
	`, req.SenderID, userID)
	if err != nil {
		http.Error(w, "DB error", http.StatusInternalServerError)
		return
	}

	// Marque la notification comme "seen"
	_, _ = sqlite.DB.Exec(`
        UPDATE notifications 
        SET seen = 1, status = 'accepted'
        WHERE sender_id = ? AND user_id = ? AND type = 'follow_request'`,
		req.SenderID, userID)

	// Envoyer une notification WebSocket aux deux utilisateurs pour mettre à jour leur interface
	notifyFollowStatusUpdate(req.SenderID, userID)

	w.WriteHeader(http.StatusOK)
	fmt.Fprint(w, "Follow accepté")
}

func RejectFollowHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := auth.GetUserIDFromSession(w, r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req struct {
		SenderID int `json:"sender_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// Supprimer la ligne followers
	_, err := sqlite.DB.Exec(`
		DELETE FROM followers
		WHERE follower_id = ? AND followed_id = ?
	`, req.SenderID, userID)
	if err != nil {
		http.Error(w, "DB error", http.StatusInternalServerError)
		return
	}

	// Marque la notif comme "seen"
	_, _ = sqlite.DB.Exec(`
    UPDATE notifications 
    SET seen = 1, status = 'rejected'
    WHERE sender_id = ? AND user_id = ? AND type = 'follow_request'`,
		req.SenderID, userID)

	w.WriteHeader(http.StatusOK)
	fmt.Fprint(w, "Follow refusé")
}

// Fonction pour notifier les utilisateurs de la mise à jour du statut
func notifyFollowStatusUpdate(userID1, userID2 int) {
	updateMessage := websocket.Message{
		Type:      "follow_status_update",
		Content:   "Follow status updated",
		From:      0, // Message système
		Timestamp: time.Now().Format(time.RFC3339),
	}

	// Envoyer à l'utilisateur 1
	Hub.SendMessageToUser(userID1, updateMessage)

	// Envoyer à l'utilisateur 2
	Hub.SendMessageToUser(userID2, updateMessage)
}
