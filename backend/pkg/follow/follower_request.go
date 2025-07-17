package follow

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"social-network/backend/pkg/db/sqlite"
)

func GetFollowersHandler(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 4 {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}
	userID, err := strconv.Atoi(parts[3]) // index 3 = user ID
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	rows, err := sqlite.DB.Query("SELECT follower_id FROM followers WHERE followed_id = ? AND status = 'accepted'", userID)
	if err != nil {
		http.Error(w, "DB error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var followerIDs []int
	for rows.Next() {
		var id int
		if err := rows.Scan(&id); err == nil {
			followerIDs = append(followerIDs, id)
		}
	}

	json.NewEncoder(w).Encode(followerIDs)
}

func GetFollowingHandler(w http.ResponseWriter, r *http.Request) {
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

	rows, err := sqlite.DB.Query("SELECT followed_id FROM followers WHERE follower_id = ? AND status = 'accepted'", userID)
	if err != nil {
		http.Error(w, "DB error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var followingIDs []int
	for rows.Next() {
		var id int
		if err := rows.Scan(&id); err == nil {
			followingIDs = append(followingIDs, id)
		}
	}

	json.NewEncoder(w).Encode(followingIDs)
}

func UserSubrouteHandler(w http.ResponseWriter, r *http.Request) {
	if strings.HasSuffix(r.URL.Path, "/followers") {
		GetFollowersHandler(w, r)
		return
	}
	if strings.HasSuffix(r.URL.Path, "/following") {
		GetFollowingHandler(w, r)
		return
	}

	http.Error(w, "Not found", http.StatusNotFound)
}
