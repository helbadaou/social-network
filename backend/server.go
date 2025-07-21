package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"social-network/backend/pkg/auth"
	"social-network/backend/pkg/chat"
	"social-network/backend/pkg/comments"
	"social-network/backend/pkg/db/sqlite"
	"social-network/backend/pkg/follow"
	"social-network/backend/pkg/notifications"
	"social-network/backend/pkg/profile"
	"social-network/backend/pkg/search"
	"social-network/backend/pkg/user"
	"social-network/backend/pkg/websocket"
)

func main() {
	hub := websocket.NewHub()

	go hub.Run()

	follow.Hub = hub

	sqlite.InitDB()

	mux := http.NewServeMux()

	mux.HandleFunc("/api/login", auth.LoginHandler)
	mux.HandleFunc("/api/register", auth.RegisterHandler)
	mux.HandleFunc("/api/logout", auth.LogoutHandler)
	mux.HandleFunc("/api/profile/", profile.ProfileHandler)

	mux.Handle("/api/posts", auth.CorsMiddleware(http.HandlerFunc(auth.PostsHandler)))

	mux.HandleFunc("/api/users/", profile.GetUserByIDHandler)
	mux.HandleFunc("/api/user-posts/", auth.GetUserPostsHandler)

	mux.HandleFunc("/api/search", search.SearchUsersHandler)
	mux.HandleFunc("/api/follow", follow.SendFollowRequest)
	mux.HandleFunc("/api/follow/status/", follow.GetFollowStatus)
	mux.HandleFunc("/api/follow/accept", follow.AcceptFollowHandler)
	mux.HandleFunc("/api/follow/reject", follow.RejectFollowHandler)
	mux.HandleFunc("/api/unfollow", follow.UnfollowUser)
	mux.HandleFunc("/api/users-followers/", follow.GetFollowersHandler)
	mux.HandleFunc("/api/users-following/", follow.GetFollowingHandler)
	mux.HandleFunc("/api/recipients", follow.GetRecipientsHandler)

	mux.HandleFunc("/api/chat-users", chat.GetAllChatUsers)
	mux.HandleFunc("/api/chat/history", chat.GetChatHistory)
	mux.HandleFunc("/api/user/toggle-privacy", user.TogglePrivacy)
	// mux.HandleFunc("/api/notifications", notifications.GetUserNotifications)
	mux.HandleFunc("/api/comments", comments.CreateCommentHandler)
	mux.HandleFunc("/api/comments/post", comments.GetCommentsByPostHandler)

	mux.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		fmt.Println("🧲 ServeWS hit") // ← Ajoute un log pour debug
		websocket.ServeWS(hub, w, r)
	})

	// ✅ Fichiers images (uploads)
	mux.Handle("/uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir("uploads"))))

	// Création du middleware personnalisé qui applique CORS uniquement sur /api/*
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/ws" {
			// Bypass CORS pour WebSocket
			mux.ServeHTTP(w, r)
			return
		}

		// Toutes les autres routes passent par CORS
		auth.CorsMiddleware(mux).ServeHTTP(w, r)
	})

	mux.HandleFunc("/api/notifications/mark-read", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req struct {
			NotificationID int `json:"notification_id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		_, err := sqlite.DB.Exec("UPDATE notifications SET seen = TRUE WHERE id = ?", req.NotificationID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusOK)
	})

	mux.HandleFunc("/api/notifications", func(w http.ResponseWriter, r *http.Request) {
		userID, ok := auth.GetUserIDFromSession(r)
		if !ok {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		notifs, err := notifications.GetUserNotifications(sqlite.DB, userID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(notifs); err != nil {
			log.Printf("Error encoding notifications: %v", err)
		}
	})

	fmt.Println("✅ Server started at :8080")
	http.ListenAndServe(":8080", handler)
}

func SetupRoutes(mux *http.ServeMux, db *sql.DB) {
	mux.HandleFunc("/api/groups", auth.GetGroupsHandler(db))
}
