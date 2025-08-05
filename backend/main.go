package main

import (
	"fmt"
	"net/http"
	"social/db/sqlite"
	"social/handlers"
	hubS "social/hub"
	"social/repositories"
	"social/services"
	"social/utils"
)

func main() {
	hub := hubS.NewHub()
	sqlite.InitDB()

	sessionRepo := repositories.NewSessionRepo(sqlite.GetDB())
	sessionService := services.NewSessionService(sessionRepo)

	go hub.Run()

	mux := http.NewServeMux()

	// auth layers
	authRepo := repositories.NewUserRepository(sqlite.GetDB())
	authService := services.NewService(*authRepo)
	authHandler := handlers.NewHandler(authService, sessionService, hub)
	hubHandler := hubS.NewHandler(authService, sessionService, hub)

	// profile layers
	profileRepo := repositories.NewProfileRepository(sqlite.GetDB())
	profileService := services.NewProfileService(*profileRepo)
	profileHandler := handlers.NewProfileHandler(profileService, sessionService, hub)

	// posts layers
	postRepo := repositories.NewPostRepository(sqlite.GetDB())
	postService := services.NewPostService(postRepo)
	postHandler := handlers.NewPostHandler(postService, sessionService)

	// follow layers
	followRepo := repositories.NewFollowRepository(sqlite.GetDB())
	followService := services.NewFollowService(followRepo)
	followHandler := handlers.NewFollowHandler(followService, sessionService, hub)

	// chat layers
	chatRepo := repositories.NewChatRepository(sqlite.GetDB())
	chatService := services.NewChatService(chatRepo)
	chatHandler := handlers.NewChatHandler(chatService, sessionService)

	// notification layers
	notifRepo := repositories.NewNotificationRepository(sqlite.GetDB())
	notifService := services.NewNotificationService(notifRepo)
	notifHandler := handlers.NewNotificationHandler(notifService, sessionService)

	// groups layers
	groupRepo := repositories.NewGroupRepository(sqlite.GetDB())
	groupService := services.NewGroupService(groupRepo)
	groupHandler := handlers.NewGroupHandler(groupService, sessionService)

	// auth routes
	mux.HandleFunc("/api/login", authHandler.LoginHandler)
	mux.HandleFunc("/api/register", authHandler.RegisterHandler)
	mux.HandleFunc("/api/logout", authHandler.LogoutHandler)

	// profile routes
	mux.HandleFunc("/api/profile/", profileHandler.ProfileHandler)
	mux.HandleFunc("/api/users/", profileHandler.GetUserByIDHandler)
	mux.HandleFunc("/api/search", profileHandler.SearchUsers)
	mux.HandleFunc("/api/user/toggle-privacy", profileHandler.TogglePrivacy)

	// post routes
	mux.Handle("/api/posts", utils.CorsMiddleware(http.HandlerFunc(postHandler.PostsHandler)))
	mux.HandleFunc("/api/user-posts/", postHandler.GetUserPostsHandler)
	mux.HandleFunc("/api/comments", postHandler.CreateCommentHandler)
	mux.HandleFunc("/api/comments/post", postHandler.GetCommentsByPostHandler)

	// follow routes
	mux.HandleFunc("/api/follow", followHandler.SendFollowRequest)
	mux.HandleFunc("/api/follow/status/", followHandler.GetFollowStatus)
	mux.HandleFunc("/api/follow/accept", followHandler.AcceptFollow)
	mux.HandleFunc("/api/follow/reject", followHandler.RejectFollow)
	mux.HandleFunc("/api/unfollow", followHandler.UnfollowUser)
	mux.HandleFunc("/api/users-followers/", followHandler.GetFollowersHandler)
	mux.HandleFunc("/api/users-following/", followHandler.GetFollowingHandler)
	mux.HandleFunc("/api/recipients", followHandler.GetRecipientsHandler)

	// chat routes
	mux.HandleFunc("/api/chat-users", chatHandler.GetAllChatUsers)
	mux.HandleFunc("/api/chat/history", chatHandler.GetChatHistory)

	// notifications routes
	mux.HandleFunc("/api/notifications", notifHandler.GetUserNotifications)
	mux.HandleFunc("/api/notifications/seen", notifHandler.MarkNotificationSeen)
	mux.HandleFunc("/api/notifications/delete", notifHandler.DeleteNotification)

	// ////////////////////////////////////////////////////////////////////

	mux.HandleFunc("/api/groups", groupHandler.DynamicMethods)

	mux.HandleFunc("/api/groups/", groupHandler.GroupRouterHandler)
	// 	switch {
	// 	case strings.HasSuffix(r.URL.Path, "/membership") && r.Method == http.MethodGet:
	// 		auth.CheckGroupAccessHandler(w, r)
	// 	case strings.HasSuffix(r.URL.Path, "/membership/pending_requests") && r.Method == http.MethodGet:
	// 		auth.GetPendingRequestsHandler(w, r)
	// 	case strings.HasSuffix(r.URL.Path, "/membership/join"):
	// 		auth.JoinGroupRequestHandler(w, r)
	// 	case strings.HasSuffix(r.URL.Path, "/membership/accept") && r.Method == http.MethodPost:
	// 		auth.AcceptGroupInviteHandler(w, r)
	// 	case strings.HasSuffix(r.URL.Path, "/membership/invite") && r.Method == http.MethodPost:
	// 		auth.InviteToGroupHandler(w, r)
	// 	case strings.HasSuffix(r.URL.Path, "/membership/approve") && r.Method == http.MethodPost:
	// 		auth.ApproveRequestHandler(w, r)
	// 	case strings.HasSuffix(r.URL.Path, "/membership/decline") && r.Method == http.MethodPost:
	// 		auth.DeclineRequestHandler(w, r)
	// 	case strings.HasSuffix(r.URL.Path, "/non-members"):
	// 		auth.GetNonGroupMembersHandler(sqlite.DB, w, r)
	// 	// NOUVELLES ROUTES POUR LES POSTS
	// 	case strings.HasSuffix(r.URL.Path, "/posts") && r.Method == http.MethodGet:
	// 		auth.GetGroupPostsHandler(w, r)
	// 	case strings.HasSuffix(r.URL.Path, "/posts") && r.Method == http.MethodPost:
	// 		auth.CreateGroupPostHandler(w, r)
	// 	// comments
	// 	case strings.HasSuffix(r.URL.Path, "/comments") && r.Method == http.MethodGet:
	// 		auth.GetGroupPostCommentsHandler(w, r)
	// 	case strings.HasSuffix(r.URL.Path, "/comments") && r.Method == http.MethodPost:
	// 		auth.CreateGroupPostCommentHandler(w, r)
	// 	// NOUVELLES ROUTES POUR LES ÉVÉNEMENTS
	// 	case strings.HasSuffix(r.URL.Path, "/events") && r.Method == http.MethodGet:
	// 		auth.GetGroupEventsHandler(w, r)
	// 	case strings.HasSuffix(r.URL.Path, "/events") && r.Method == http.MethodPost:
	// 		auth.CreateGroupEventHandler(w, r)
	// 	case strings.HasSuffix(r.URL.Path, "/messages") && r.Method == http.MethodPost:
	// 		chat.HandleGroupMessage(w, r)
	// 	case strings.HasSuffix(r.URL.Path, "/messages") && r.Method == http.MethodGet:
	// 		chat.GetGroupMessagesHandler(w, r)
	// 	default:
	// 		http.NotFound(w, r)
	// 	}
	// }))

	// mux.HandleFunc("/api/events/", auth.AuthMiddleware(func(w http.ResponseWriter, r *http.Request) {
	// 	switch {
	// 	case strings.HasSuffix(r.URL.Path, "/responses") && r.Method == http.MethodGet:
	// 		auth.GetEventResponsesHandler(w, r)
	// 	case strings.HasSuffix(r.URL.Path, "/respond") && r.Method == http.MethodPost:
	// 		auth.RespondToEventHandler(w, r)
	// 	default:
	// 		http.NotFound(w, r)
	// 	}
	// }))
	mux.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		fmt.Println("🧲 ServeWS hit") // ← Ajoute un log pour debug
		hubHandler.ServeWS(hub, w, r)
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
		utils.CorsMiddleware(mux).ServeHTTP(w, r)
	})

	// handler := utils.CorsMiddleware(mux)

	fmt.Println("✅ Server started at :8080")
	http.ListenAndServe(":8080", handler)
}

// func SetupRoutes(mux *http.ServeMux, db *sql.DB) {
// 	mux.HandleFunc("/api/groups", auth.GetGroupsHandler(db))
// }
