package main

import (
	"fmt"
	"net/http"

	"social-network/backend/pkg/auth"
	"social-network/backend/pkg/db/sqlite"
)

func main() {
	sqlite.InitDB()

	http.HandleFunc("/api/ping", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, "pong")
	})
	mux := http.NewServeMux()

	mux.HandleFunc("/api/login", auth.LoginHandler)
	mux.HandleFunc("/api/register", auth.RegisterHandler)
	mux.HandleFunc("/api/logout", auth.LogoutHandler)
	mux.HandleFunc("/api/profile", auth.ProfileHandler)
	mux.Handle("/api/posts", auth.CorsMiddleware(http.HandlerFunc(auth.PostsHandler)))

	handlerWithCors := auth.CorsMiddleware(mux)

	fmt.Println("✅ Server started at :8080")
	http.ListenAndServe(":8080", handlerWithCors)
}
