package main

import (
	"fmt"
	"net/http"

	"social-network/backend/pkg/auth"
	"social-network/backend/pkg/db/sqlite"
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
	mux.HandleFunc("/api/profile/", auth.ProfileHandler)

	mux.Handle("/api/posts", auth.CorsMiddleware(http.HandlerFunc(auth.PostsHandler)))


	mux.HandleFunc("/api/users/", auth.GetUserByIDHandler)
	mux.HandleFunc("/api/user-posts/", auth.GetUserPostsHandler)

	mux.HandleFunc("/api/search", auth.SearchUsersHandler)
	mux.HandleFunc("/api/follow", auth.SendFollowRequest)
	http.HandleFunc("/api/follow/status/", auth.GetFollowStatus)

	mux.HandleFunc("/api/chat-users", auth.GetAllChatUsers)


   mux.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		
		cookie, err := r.Cookie("session_id")
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		websocket.ServeWS(hub, w, r, cookie.Value)
	})








	handlerWithCors := auth.CorsMiddleware(mux)

	fmt.Println("✅ Server started at :8080")
	http.ListenAndServe(":8080", handlerWithCors)

}
