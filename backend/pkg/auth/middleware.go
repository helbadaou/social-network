package auth

import (
	"net/http"
	"strconv"
)

func AuthMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie("session_id")
		if err != nil || cookie.Value == "" {
			http.Error(w, "Unauthorized - Please log in", http.StatusUnauthorized)
			return
		}

		// Optional: validate cookie value is a number (userID)
		if _, err := strconv.Atoi(cookie.Value); err != nil {
			http.Error(w, "Unauthorized - Invalid session", http.StatusUnauthorized)
			return
		}

		next.ServeHTTP(w, r)
	}
}


func CorsMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000") // your frontend URL
       // w.Header().Set("Access-Control-Allow-Origin", "http://10.1.17.22:3000") 
		w.Header().Set("Access-Control-Allow-Credentials", "true")
        w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
        w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

        if r.Method == "OPTIONS" {
            w.WriteHeader(http.StatusOK)
            return
        }

        next.ServeHTTP(w, r)
    })
}

