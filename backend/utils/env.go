package utils

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

const (
	defaultBackendURL    = "http://localhost:8080"
	defaultFrontendURL   = "http://localhost:3000"
	defaultUploadsFolder = "uploads"
	defaultDBPath        = "./social.db?charset=utf8"
)

func backendURL() string {
	url := strings.TrimRight(os.Getenv("BACKEND_PUBLIC_URL"), "/")
	if url == "" {
		url = strings.TrimRight(os.Getenv("PUBLIC_URL"), "/")
	}
	if url == "" {
		url = strings.TrimRight(defaultBackendURL, "/")
	}
	return url
}

func BackendBaseURL() string {
	return backendURL()
}

func FrontendOrigin() string {
	origin := strings.TrimRight(os.Getenv("FRONTEND_ORIGIN"), "/")
	if origin == "" {
		origin = strings.TrimRight(defaultFrontendURL, "/")
	}
	return origin
}

func FrontendOrigins() []string {
	raw := strings.TrimSpace(os.Getenv("FRONTEND_ORIGINS"))
	if raw == "" {
		return []string{FrontendOrigin()}
	}

	parts := strings.Split(raw, ",")
	origins := make([]string, 0, len(parts))
	seen := map[string]struct{}{}

	for _, part := range parts {
		origin := strings.TrimRight(strings.TrimSpace(part), "/")
		if origin == "" {
			continue
		}
		if _, ok := seen[origin]; ok {
			continue
		}
		seen[origin] = struct{}{}
		origins = append(origins, origin)
	}

	if len(origins) == 0 {
		return []string{FrontendOrigin()}
	}

	return origins
}

func UploadsDir() string {
	dir := strings.TrimRight(os.Getenv("UPLOADS_DIR"), "/")
	if dir == "" {
		dir = defaultUploadsFolder
	}
	return dir
}

func DatabasePath() string {
	path := strings.TrimSpace(os.Getenv("DB_PATH"))
	if path == "" {
		path = defaultDBPath
	}
	return path
}

func AbsoluteURL(path string) string {
	if path == "" {
		return ""
	}
	if strings.HasPrefix(path, "http://") || strings.HasPrefix(path, "https://") {
		return path
	}
	cleaned := strings.TrimLeft(path, "/")
	return backendURL() + "/" + cleaned
}

func UploadURL(parts ...string) string {
	joined := filepath.ToSlash(filepath.Join(parts...))
	return AbsoluteURL(filepath.ToSlash(filepath.Join("uploads", joined)))
}

func UploadPath(parts ...string) string {
	all := append([]string{UploadsDir()}, parts...)
	return filepath.Join(all...)
}

func CookieSameSite() http.SameSite {
	mode := strings.ToLower(strings.TrimSpace(os.Getenv("COOKIE_SAMESITE")))
	switch mode {
	case "none":
		return http.SameSiteNoneMode
	case "strict":
		return http.SameSiteStrictMode
	default:
		return http.SameSiteLaxMode
	}
}

func CookieSecure(r *http.Request) bool {
	if value := strings.ToLower(strings.TrimSpace(os.Getenv("COOKIE_SECURE"))); value == "true" || value == "1" {
		return true
	}
	if r == nil {
		return false
	}
	if r.TLS != nil {
		return true
	}
	return strings.EqualFold(r.Header.Get("X-Forwarded-Proto"), "https")
}
