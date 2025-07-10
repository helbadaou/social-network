package main

import (
"fmt"
	"net/http"

	"social-network/backend/pkg/db/sqlite"
	"social-network/backend/pkg/auth"

)

func main() {

	sqlite.InitDB()

	http.HandleFunc("/api/ping", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, "pong")
	})

    http.Handle("/api/login", auth.CorsMiddleware(http.HandlerFunc(auth.LoginHandler)))
    http.Handle("/api/register", auth.CorsMiddleware(http.HandlerFunc(auth.RegisterHandler)))
    http.Handle("/api/logout",  auth.CorsMiddleware(http.HandlerFunc(auth.LogoutHandler)))
    http.Handle("/api/profile", auth.CorsMiddleware(auth.AuthMiddleware(auth.ProfileHandler)))
    //http.HandleFunc("/follow", handlers.SendFollowRequest)


	fmt.Println("✅ Server started at :8080")
	http.ListenAndServe(":8080", nil)
}
