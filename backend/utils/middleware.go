package utils

import (
	"context"
	"net/http"
	"net/url"
	"os"
	"social/services"
	"strings"
)

// CorsMiddleware gère les CORS pour permettre les requêtes depuis le frontend
func CorsMiddleware(next http.Handler) http.Handler {
	allowedOriginsRaw := os.Getenv("CORS_ALLOWED_ORIGINS")
	if strings.TrimSpace(allowedOriginsRaw) == "" {
		allowedOriginsRaw = "http://localhost:3000,http://127.0.0.1:3000,https://social-network-frontend-helbadao.fly.dev,https://social-network.houssam-elbadaoui.tech"
	}

	allowedOrigins := make(map[string]struct{})
	allowedWildcards := make([]string, 0)
	for _, origin := range strings.Split(allowedOriginsRaw, ",") {
		trimmed := strings.TrimSpace(origin)
		if trimmed != "" {
			normalized := normalizeOrigin(trimmed)
			if normalized == "" {
				continue
			}

			if strings.Contains(normalized, "*.") {
				allowedWildcards = append(allowedWildcards, normalized)
				continue
			}

			allowedOrigins[normalized] = struct{}{}
		}
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := normalizeOrigin(r.Header.Get("Origin"))
		if origin != "" && isAllowedOrigin(origin, allowedOrigins, allowedWildcards) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Add("Vary", "Origin")
		}

		w.Header().Set("Access-Control-Allow-Credentials", "true")
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func normalizeOrigin(origin string) string {
	origin = strings.TrimSpace(origin)
	if origin == "" {
		return ""
	}

	u, err := url.Parse(origin)
	if err != nil || u.Scheme == "" || u.Host == "" {
		return ""
	}

	return strings.ToLower(u.Scheme + "://" + u.Host)
}

func isAllowedOrigin(origin string, exact map[string]struct{}, wildcards []string) bool {
	if _, ok := exact[origin]; ok {
		return true
	}

	for _, pattern := range wildcards {
		parts := strings.SplitN(pattern, "://", 2)
		if len(parts) != 2 {
			continue
		}
		scheme, hostPattern := parts[0], parts[1]

		originParts := strings.SplitN(origin, "://", 2)
		if len(originParts) != 2 || originParts[0] != scheme {
			continue
		}

		if strings.HasPrefix(hostPattern, "*.") {
			suffix := strings.TrimPrefix(hostPattern, "*.")
			if strings.HasSuffix(originParts[1], "."+suffix) || originParts[1] == suffix {
				return true
			}
		}
	}

	return false
}

// AuthMiddleware vérifie l'authentification et injecte l'userID dans le contexte
func AuthMiddleware(sessionService *services.SessionService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID, err := sessionService.GetUserIDFromSession(r)
			if err != nil {
				WriteError(w, http.StatusUnauthorized, "Unauthorized")
				return
			}

			ctx := context.WithValue(r.Context(), "userID", userID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// GetUserIDFromContext récupère l'userID depuis le contexte
func GetUserIDFromContext(ctx context.Context) (int, bool) {
	userID, ok := ctx.Value("userID").(int)
	return userID, ok
}
