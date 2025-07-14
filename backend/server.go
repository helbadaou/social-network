package main

import (
	"fmt"
	"net/http"

	"social-network/backend/pkg/auth"
	"social-network/backend/pkg/chat"
	"social-network/backend/pkg/db/sqlite"
	"social-network/backend/pkg/follow"
	"social-network/backend/pkg/profile"
	"social-network/backend/pkg/search"
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
	http.HandleFunc("/api/follow/status/", follow.GetFollowStatus)

	mux.HandleFunc("/api/chat-users", chat.GetAllChatUsers)

	mux.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {

	 
		websocket.ServeWS(hub, w, r)
	})

	handlerWithCors := auth.CorsMiddleware(mux)

	fmt.Println("✅ Server started at :8080")
	http.ListenAndServe(":8080", handlerWithCors)

}
