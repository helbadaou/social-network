package main

import (
"fmt"
	"net/http"

	"social-network/backend/pkg/db/sqlite"
	"social-network/backend/pkg/auth"

)

func main() {
	
	sqlite.InitDB()

	mux := http.NewServeMux()


	mux.HandleFunc("/api/login", auth.LoginHandler)
	mux.HandleFunc("/api/register", auth.RegisterHandler)
	mux.HandleFunc("/api/logout", auth.LogoutHandler)
	mux.HandleFunc("/api/profile", auth.ProfileHandler)
	// mux.HandleFunc("/search", auth.SearchUsers)
	// mux.HandleFunc("/follow", handlers.SendFollowRequest)

	// Wrap entire mux with CORS middleware once
	handlerWithCors := auth.CorsMiddleware(mux)

	fmt.Println("✅ Server started at :8080")
	http.ListenAndServe(":8080", handlerWithCors)
}
