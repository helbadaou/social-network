package follow

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"

	"social-network/backend/pkg/auth"
	"social-network/backend/pkg/db/sqlite"
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

	// Vérifie s'il existe déjà une relation
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
		w.Header().Set("Content-Type", "application/json")
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

	if isPrivate {
		// Récupérer les infos de l'expéditeur
		var senderFirstName, senderLastName string
		err := sqlite.DB.QueryRow(`
            SELECT first_name, last_name FROM users WHERE id = ?
        `, followerID).Scan(&senderFirstName, &senderLastName)
		if err != nil {
			http.Error(w, "Failed to get sender info", http.StatusInternalServerError)
			return
		}

		senderName := fmt.Sprintf("%s %s", senderFirstName, senderLastName)
		message := fmt.Sprintf("%s vous a envoyé une demande d'abonnement", senderName)

		// Créer la notification en base de données
		_, err = sqlite.DB.Exec(`
            INSERT INTO notifications (sender_id, receiver_id, message, type)
            VALUES (?, ?, ?, 'follow_request')
        `, followerID, req.FollowedID, message)
		if err != nil {
			log.Printf("Failed to create notification: %v", err)
			http.Error(w, "Failed to create notification", http.StatusInternalServerError)
			return
		}

		// Envoyer la notification via WebSocket si le hub est disponible
		if Hub != nil {
			Hub.SendFollowRequest(followerID, req.FollowedID, senderName)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status":  "success",
		"message": "Follow request sent",
		"private": strconv.FormatBool(isPrivate),
	})
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
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"status": "",
		})
		return
	} else if err != nil {
		http.Error(w, "DB error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
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

// Dans handlers.go, remplacez AcceptFollowHandler par :
func AcceptFollowHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := auth.GetUserIDFromSession(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req struct {
		SenderID       int `json:"sender_id"`
		NotificationID int `json:"notification_id"`
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
		log.Printf("Error updating follower status: %v", err)
		http.Error(w, "DB error", http.StatusInternalServerError)
		return
	}

	// Supprimer la notification au lieu de la marquer comme vue
	if req.NotificationID > 0 {
		_, err = sqlite.DB.Exec(`
			DELETE FROM notifications 
			WHERE id = ? AND receiver_id = ? AND sender_id = ? AND type = 'follow_request'
		`, req.NotificationID, userID, req.SenderID)
		if err != nil {
			log.Printf("Error deleting notification: %v", err)
		}
	}

	w.WriteHeader(http.StatusOK)
	fmt.Fprint(w, "Follow accepté")
}

// Et remplacez RejectFollowHandler par :
func RejectFollowHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := auth.GetUserIDFromSession(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req struct {
		SenderID       int `json:"sender_id"`
		NotificationID int `json:"notification_id"`
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
		log.Printf("Error deleting follower: %v", err)
		http.Error(w, "DB error", http.StatusInternalServerError)
		return
	}

	// Supprimer la notification
	if req.NotificationID > 0 {
		_, err = sqlite.DB.Exec(`
			DELETE FROM notifications 
			WHERE id = ? AND receiver_id = ? AND sender_id = ? AND type = 'follow_request'
		`, req.NotificationID, userID, req.SenderID)
		if err != nil {
			log.Printf("Error deleting notification: %v", err)
		}
	}

	w.WriteHeader(http.StatusOK)
	fmt.Fprint(w, "Follow refusé")
}