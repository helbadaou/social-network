package auth

import (
	"encoding/json"
	"fmt"
	"net/http"
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

	// 🔽 Limite de taille (ex: 10 Mo)
	err := r.ParseMultipartForm(10 << 20)
	if err != nil {
		http.Error(w, "Could not parse multipart form", http.StatusBadRequest)
		return
	}

	content := r.FormValue("content")
	privacy := r.FormValue("privacy")
	fmt.Println("Content:", content)
	fmt.Println("Privacy:", privacy)
	// fmt.Println("Image header:", header)

	if content == "" || privacy == "" {
		http.Error(w, "Missing fields", http.StatusBadRequest)
		return
	}

	// (Optionnel) Récupérer le fichier image
	// file, header, err := r.FormFile("image")
	// var imageURL string
	// if err == nil && header != nil {
	// 	// ⚠️ Pour le moment on ne sauvegarde pas le fichier
	// 	// Tu peux mettre un placeholder ou log pour debug
	// 	defer file.Close()
	// 	imageURL = "placeholder.jpg" // ou vide pour l’instant
	// }

	post := models.Post{
		AuthorID: userID,
		Content:  content,
		// ImageURL:  imageURL,
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