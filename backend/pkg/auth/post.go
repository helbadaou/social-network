package auth

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"social-network/backend/pkg/db/sqlite"
	"social-network/backend/pkg/models"
)

func CreatePost(w http.ResponseWriter, r *http.Request) {
	userID, ok := GetUserIDFromSession(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	err := r.ParseMultipartForm(10 << 20) // 10MB
	if err != nil {
		http.Error(w, "Could not parse multipart form", http.StatusBadRequest)
		return
	}

	content := r.FormValue("content")
	privacy := r.FormValue("privacy")

	if content == "" || privacy == "" {
		http.Error(w, "Missing fields", http.StatusBadRequest)
		return
	}

	var imageURL string
	file, header, err := r.FormFile("image")
	if err == nil && header != nil {
		defer file.Close()

		// 🔥 Sauvegarde le fichier dans /uploads/
		filename := fmt.Sprintf("%d_%s", time.Now().UnixNano(), header.Filename)
		dstPath := fmt.Sprintf("uploads/%s", filename)

		dstFile, err := os.Create(dstPath)
		if err != nil {
			http.Error(w, "Failed to save file", http.StatusInternalServerError)
			return
		}
		defer dstFile.Close()

		_, err = io.Copy(dstFile, file)
		if err != nil {
			http.Error(w, "Failed to copy file", http.StatusInternalServerError)
			return
		}

		imageURL = "/uploads/" + filename
	}

	post := models.Post{
		AuthorID:  userID,
		Content:   content,
		ImageURL:  imageURL,
		Privacy:   privacy,
		CreatedAt: time.Now(),
	}

	err = sqlite.CreatePost(post)
	if err != nil {
		http.Error(w, "Failed to create post", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
}


func GetPostsHandler(w http.ResponseWriter, r *http.Request) {
	// Vérifie que l'utilisateur est connecté
	_, ok := GetUserIDFromSession(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	posts, err := sqlite.GetPosts()
	if err != nil {
		http.Error(w, "Failed to get posts", http.StatusInternalServerError)
		return
	}

	// ✅ Très important : définir le bon Content-Type
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	// ✅ Encoder le tableau même s'il est vide
	fmt.Println("Posts récupérés :", posts)
	json.NewEncoder(w).Encode(posts)
}

func PostsHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		GetPostsHandler(w, r)
	case http.MethodPost:
		CreatePost(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// GET /api/users/{id}/posts
func GetUserPostsHandler(w http.ResponseWriter, r *http.Request) {
	idStr := strings.TrimPrefix(r.URL.Path, "/api/user-posts/")
	userID, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	rows, err := sqlite.DB.Query(`
		SELECT id, content, image_url, created_at 
		FROM posts 
		WHERE author_id = ? 
		ORDER BY created_at DESC
	`, userID)
	if err != nil {
		log.Println("⛔ Erreur SQL GetUserPostsHandler:", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var posts []struct {
		ID        int    `json:"id"`
		Content   string `json:"content"`
		Image     string `json:"image_url"`
		CreatedAt string `json:"created_at"`
	}

	for rows.Next() {
		var post struct {
			ID        int    `json:"id"`
			Content   string `json:"content"`
			Image     string `json:"image_url"`
			CreatedAt string `json:"created_at"`
		}
		if err := rows.Scan(&post.ID, &post.Content, &post.Image, &post.CreatedAt); err != nil {
			continue
		}
		posts = append(posts, post)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(posts) // ✅ pas de WriteHeader manuelle si tout va bien
}