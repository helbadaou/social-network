package follow

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"social-network/backend/pkg/db/sqlite"
)

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

	// // Si le profil est privé, créer une notification
	// if isPrivate {
	// 	status = "pending"

	// 	// 🔔 Créer la notification
	// 	_, err := sqlite.DB.Exec(`
	// 		INSERT INTO notifications (user_id, sender_id, type, message)
	// 		VALUES (?, ?, 'follow_request', ?)
	// 	`, req.FollowedID, followerID, "Nouvelle demande d'abonnement")
	// 	if err != nil {
	// 		fmt.Println("Erreur création notification:", err)
	// 	}
	// }

	// // Enregistrement dans la table followers
	// _, err = sqlite.DB.Exec(`
	// 	INSERT OR REPLACE INTO followers (follower_id, followed_id, status)
	// 	VALUES (?, ?, ?)
	// `, followerID, req.FollowedID, status)
	// if err != nil {
	// 	http.Error(w, "Erreur DB", http.StatusInternalServerError)
	// 	return
	// }

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
