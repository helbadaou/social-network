// follow/handlers.go

package follow

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"social-network/backend/pkg/db/sqlite"
	"strconv"
	"strings"
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

	id, err := strconv.Atoi(cookie.Value)
	if err != nil {
		http.Error(w, "Invalid session ID", http.StatusBadRequest)
		return
	}

	followerID := id

	// Get followed_id from JSON body
	var req struct {
		FollowedID int `json:"followed_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}
	// fmt.Printf("🔍 Body reçu: %+v\n", req)
	// fmt.Println("▶ Followed ID reçu:", req.FollowedID)
	// fmt.Println("▶ Follower ID (depuis cookie):", followerID)

	// Check if follow already exists
	var exists int

	err = sqlite.DB.QueryRow(
		`SELECT COUNT(*) FROM followers WHERE follower_id = ? AND followed_id = ?`,
		followerID, req.FollowedID,
	).Scan(&exists)
	if err != nil {
		http.Error(w, "DB error", http.StatusInternalServerError)
		return
	}

	if exists > 0 {
		// http.Error(w, "Follow request already sent", http.StatusConflict)
		return
	}

	// Check if followed user is public or private
	var isPrivate bool
	err = sqlite.DB.QueryRow(`SELECT is_private FROM users WHERE id = ?`, req.FollowedID).Scan(&isPrivate)
	if err != nil {
		// fmt.Println("❌ Erreur SQL SELECT is_private:", err)
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	status := "pending"
	if !isPrivate {
		status = "accepted"
	}

	_, err = sqlite.DB.Exec(`
		INSERT INTO followers (follower_id, followed_id, status)
		VALUES (?, ?, ?)`, followerID, req.FollowedID, status)
	if err != nil {
		http.Error(w, "Insert error", http.StatusInternalServerError)
		return
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
		w.WriteHeader(http.StatusNoContent)
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
