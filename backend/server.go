package main

import (
	"fmt"
	"net/http"
	"strings"
	"database/sql"

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
	mux.HandleFunc("/api/notifications", notifications.GetUserNotifications)
	mux.HandleFunc("/api/notifications/seen", notifications.MarkNotificationSeen)
	mux.HandleFunc("/api/notifications/delete", notifications.DeleteNotification)
	mux.HandleFunc("/api/comments", comments.CreateCommentHandler)
	mux.HandleFunc("/api/comments/post", comments.GetCommentsByPostHandler)

 //////////////////////////////////////////////////////////////////////
	
mux.HandleFunc("/api/groups", func(w http.ResponseWriter, r *http.Request) {
        if r.Method == http.MethodGet {
            auth.GetGroupsHandler(sqlite.DB)(w, r)
        } else if r.Method == http.MethodPost {
            auth.CreateGroupHandler(sqlite.DB)(w, r)
        }
    })
	
mux.HandleFunc("/api/groups/", auth.AuthMiddleware(func(w http.ResponseWriter, r *http.Request) {
	switch {
	case strings.HasSuffix(r.URL.Path, "/membership") && r.Method == http.MethodGet:
		auth.CheckGroupAccessHandler(w, r) //{"status": status}
	case strings.HasSuffix(r.URL.Path, "/membership/join") && r.Method == http.MethodPost:
		auth.JoinGroupRequestHandler(w, r)
	case strings.HasSuffix(r.URL.Path, "/membership/accept") && r.Method == http.MethodPost:
		auth.AcceptGroupInviteHandler(w, r)
	case strings.HasSuffix(r.URL.Path, "/membership/invite") && r.Method == http.MethodPost:
		auth.InviteToGroupHandler(w, r)
	case strings.HasSuffix(r.URL.Path, "/membership/approve") && r.Method == http.MethodPost:
		auth.ApproveRequestHandler(w, r)
	case strings.HasSuffix(r.URL.Path, "/membership/decline") && r.Method == http.MethodPost:
        auth.DeclineGroupInviteHandler(w, r)
	case strings.HasSuffix(r.URL.Path, "/non-members"):
        auth.GetNonGroupMembersHandler(sqlite.DB, w, r)	
	// Add more here if needed
	default:
		http.NotFound(w, r)
	}
}))

//////////////////////////////////////////////////////////////////////


	//mux.HandleFunc("/api/groups/invite", auth.InviteUserToGroupHandler(sqlite.DB))

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

	
	fmt.Println("✅ Server started at :8080")
	http.ListenAndServe(":8080", handler)

	fmt.Println("✅ Server started at :8080")
	http.ListenAndServe(":8080", handler)
}


func SetupRoutes(mux *http.ServeMux, db *sql.DB) {
	mux.HandleFunc("/api/groups", auth.GetGroupsHandler(db))
}