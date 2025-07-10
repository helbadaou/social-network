package main

import (
	"fmt"
	"net/http"

	"social-network/backend/pkg/auth"
	"social-network/backend/pkg/db/sqlite"
)

func main() {
	sqlite.InitDB()


	mux := http.NewServeMux()

	mux.HandleFunc("/api/login", auth.LoginHandler)
	mux.HandleFunc("/api/register", auth.RegisterHandler)
	mux.HandleFunc("/api/logout", auth.LogoutHandler)
	mux.HandleFunc("/api/profile/", auth.ProfileHandler)

	mux.Handle("/api/posts", auth.CorsMiddleware(http.HandlerFunc(auth.PostsHandler)))





	mux.HandleFunc("/api/users/", auth.GetUserByIDHandler)
	mux.HandleFunc("/api/search", auth.SearchUsersHandler)
	mux.HandleFunc("/api/follow", auth.SendFollowRequest)
	http.HandleFunc("/api/follow/status/", auth.GetFollowStatus)

		mux.HandleFunc("/api/users2", auth.GetAllChatUsers)



	handlerWithCors := auth.CorsMiddleware(mux)

	fmt.Println("✅ Server started at :8080")
	http.ListenAndServe(":8080", handlerWithCors)

}
