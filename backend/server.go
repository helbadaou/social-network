package main

import (
	"fmt"
	"net/http"

	"social-network/backend/pkg/auth"
	"social-network/backend/pkg/chat"
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
	mux.HandleFunc("/api/unfollow", follow.UnfollowUser)

	mux.HandleFunc("/api/chat-users", chat.GetAllChatUsers)
	mux.HandleFunc("/api/user/toggle-privacy", user.TogglePrivacy)
	mux.HandleFunc("/api/notifications", notifications.GetUserNotifications)

	mux.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		fmt.Println("🧲 ServeWS hit") // ← Ajoute un log pour debug
		websocket.ServeWS(hub, w, r)
	})

	// ✅ Fichiers images (uploads)
	mux.Handle("/uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir("./uploads"))))

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

	fmt.Println("✅ Server started at :8080")
	http.ListenAndServe(":8080", handler)
}
