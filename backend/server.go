package main

import (
    "log"
    "net/http"
    "os"
    "social-network/pkg/db/sqlite"
    "social-network/pkg/handlers"
    "social-network/pkg/middleware"
    "social-network/pkg/websocket"
)

func main() {
    // Initialize database
    db, err := sqlite.InitDB()
    if err != nil {
        log.Fatal("Failed to initialize database:", err)
    }
    defer db.Close()

    // Run migrations
    if err := sqlite.RunMigrations(); err != nil {
        log.Fatal("Failed to run migrations:", err)
    }

    // Create uploads directories
    os.MkdirAll("uploads/avatars", 0755)
    os.MkdirAll("uploads/posts", 0755)

    // Initialize WebSocket hub
    hub := websocket.NewHub()
    go hub.Run()

    // Initialize handlers
    authHandler := handlers.NewAuthHandler(db)
    userHandler := handlers.NewUserHandler(db)
    // postHandler := handlers.NewPostHandler(db)
    // groupHandler := handlers.NewGroupHandler(db)
    // messageHandler := handlers.NewMessageHandler(db)
    // notificationHandler := handlers.NewNotificationHandler(db)
    // wsHandler := handlers.NewWebSocketHandler(hub)

    // Setup routes
    mux := http.NewServeMux()

    // Static files
    mux.Handle("/uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir("uploads"))))

    // Auth routes
    mux.HandleFunc("/api/auth/register", middleware.CORS(authHandler.Register))
    mux.HandleFunc("/api/auth/login", middleware.CORS(authHandler.Login))
    mux.HandleFunc("/api/auth/logout", middleware.CORS(middleware.AuthMiddleware(authHandler.Logout)))
    mux.HandleFunc("/api/auth/me", middleware.CORS(middleware.AuthMiddleware(authHandler.GetCurrentUser)))

    // User routes
    mux.HandleFunc("/api/users", middleware.CORS(middleware.AuthMiddleware(userHandler.GetUsers)))
    mux.HandleFunc("/api/users/profile", middleware.CORS(middleware.AuthMiddleware(userHandler.GetProfile)))
    mux.HandleFunc("/api/users/profile/update", middleware.CORS(middleware.AuthMiddleware(userHandler.UpdateProfile)))
    mux.HandleFunc("/api/users/follow", middleware.CORS(middleware.AuthMiddleware(userHandler.FollowUser)))
    mux.HandleFunc("/api/users/unfollow", middleware.CORS(middleware.AuthMiddleware(userHandler.UnfollowUser)))
    mux.HandleFunc("/api/users/follow-requests", middleware.CORS(middleware.AuthMiddleware(userHandler.GetFollowRequests)))
    mux.HandleFunc("/api/users/follow-requests/respond", middleware.CORS(middleware.AuthMiddleware(userHandler.RespondToFollowRequest)))

    // Post routes
    // mux.HandleFunc("/api/posts", middleware.CORS(middleware.AuthMiddleware(postHandler.GetPosts)))
    // mux.HandleFunc("/api/posts/create", middleware.CORS(middleware.AuthMiddleware(postHandler.CreatePost)))
    // mux.HandleFunc("/api/posts/comment", middleware.CORS(middleware.AuthMiddleware(postHandler.CreateComment)))
    // mux.HandleFunc("/api/posts/like", middleware.CORS(middleware.AuthMiddleware(postHandler.LikePost)))

    // // Group routes
    // mux.HandleFunc("/api/groups", middleware.CORS(middleware.AuthMiddleware(groupHandler.GetGroups)))
    // mux.HandleFunc("/api/groups/create", middleware.CORS(middleware.AuthMiddleware(groupHandler.CreateGroup)))
    // mux.HandleFunc("/api/groups/join", middleware.CORS(middleware.AuthMiddleware(groupHandler.JoinGroup)))
    // mux.HandleFunc("/api/groups/invite", middleware.CORS(middleware.AuthMiddleware(groupHandler.InviteToGroup)))
    // mux.HandleFunc("/api/groups/posts", middleware.CORS(middleware.AuthMiddleware(groupHandler.GetGroupPosts)))
    // mux.HandleFunc("/api/groups/posts/create", middleware.CORS(middleware.AuthMiddleware(groupHandler.CreateGroupPost)))
    // mux.HandleFunc("/api/groups/events", middleware.CORS(middleware.AuthMiddleware(groupHandler.GetGroupEvents)))
    // mux.HandleFunc("/api/groups/events/create", middleware.CORS(middleware.AuthMiddleware(groupHandler.CreateEvent)))
    // mux.HandleFunc("/api/groups/events/respond", middleware.CORS(middleware.AuthMiddleware(groupHandler.RespondToEvent)))

    // // Message routes
    // mux.HandleFunc("/api/messages", middleware.CORS(middleware.AuthMiddleware(messageHandler.GetMessages)))
    // mux.HandleFunc("/api/messages/send", middleware.CORS(middleware.AuthMiddleware(messageHandler.SendMessage)))
    // mux.HandleFunc("/api/messages/group", middleware.CORS(middleware.AuthMiddleware(messageHandler.GetGroupMessages)))

    // // Notification routes
    // mux.HandleFunc("/api/notifications", middleware.CORS(middleware.AuthMiddleware(notificationHandler.GetNotifications)))
    // mux.HandleFunc("/api/notifications/mark-read", middleware.CORS(middleware.AuthMiddleware(notificationHandler.MarkAsRead)))

    // WebSocket
    // mux.HandleFunc("/ws", middleware.CORS(wsHandler.HandleWebSocket))

    // Add logging middleware
    handler := middleware.LoggingMiddleware(mux)

    log.Println("Server starting on :8080")
    if err := http.ListenAndServe(":8080", handler); err != nil {
        log.Fatal("Server failed to start:", err)
    }
}