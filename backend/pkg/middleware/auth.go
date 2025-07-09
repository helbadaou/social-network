package middleware

import (
    "context"
    "net/http"
    "social-network/pkg/db/sqlite"
    "social-network/pkg/models"
    "social-network/pkg/utils"
)

type contextKey string

const UserIDKey contextKey = "userID"

func AuthMiddleware(next http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        // Get session cookie
        cookie, err := r.Cookie("session_token")
        if err != nil {
            utils.SendErrorResponse(w, "Unauthorized", http.StatusUnauthorized)
            return
        }

        // Validate session
        session := &models.Session{}
        if err := session.GetByID(sqlite.GetDB(), cookie.Value); err != nil {
            utils.SendErrorResponse(w, "Invalid session", http.StatusUnauthorized)
            return
        }

        // Add user ID to context
        ctx := context.WithValue(r.Context(), UserIDKey, session.UserID)
        next.ServeHTTP(w, r.WithContext(ctx))
    }
}

func GetUserIDFromContext(r *http.Request) int {
    userID, ok := r.Context().Value(UserIDKey).(int)
    if !ok {
        return 0
    }
    return userID
}