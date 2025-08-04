package comments

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"social-network/backend/pkg/auth"
	"social-network/backend/pkg/db/sqlite"
	// "social-network/backend/pkg/models"
)

func CreateCommentHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Méthode non autorisée", http.StatusMethodNotAllowed)
		return
	}
	log.Println("📥 Création d'un commentaire...")

	userID, ok := auth.GetUserIDFromSession(w, r)
	if !ok {
		log.Println("❌ Utilisateur non authentifié")
		http.Error(w, "Non autorisé", http.StatusUnauthorized)
		return
	}
	log.Println("✅ UserID :", userID)

	// Parse le formulaire multipart (obligatoire avant r.FormValue ou r.FormFile)
	err := r.ParseMultipartForm(10 << 20) // 10MB
	if err != nil {
		log.Println("❌ Erreur parsing formulaire:", err)
		http.Error(w, "Formulaire invalide", http.StatusBadRequest)
		return
	}

	postID := r.FormValue("post_id")
	if postID == "" {
		log.Println("❌ post_id manquant")
		http.Error(w, "Post ID requis", http.StatusBadRequest)
		return
	}

	content := r.FormValue("content")
	log.Println("📝 Contenu du commentaire :", content)

	if content == "" && r.MultipartForm == nil {
		http.Error(w, "Commentaire vide", http.StatusBadRequest)
		return
	}

	var image string
	file, fileHeader, err := r.FormFile("image")
	if err == nil {
		defer file.Close()
		log.Println("📷 Image reçue :", fileHeader.Filename)

		if err := IsValidImage(fileHeader); err != nil {
			log.Println("❌ Image non valide :", err)
			http.Error(w, "Format image non supporté", http.StatusBadRequest)
			return
		}

		filename := GenerateFilename(fileHeader.Filename)
		dstPath := filepath.Join("uploads", filename)

		dst, err := os.Create(dstPath)
		if err != nil {
			log.Println("❌ Erreur création fichier :", err)
			http.Error(w, "Erreur serveur", http.StatusInternalServerError)
			return
		}
		defer dst.Close()
		_, err = io.Copy(dst, file)
		if err != nil {
			log.Println("❌ Erreur copie fichier :", err)
			http.Error(w, "Erreur lors de l'enregistrement de l'image", http.StatusInternalServerError)
			return
		}

		image = "/uploads/" + filename
		log.Println("✅ Image enregistrée :", image)
	} else {
		log.Println("ℹ️ Pas d'image jointe.")
	}

	// Si aucun texte ET pas d’image, on bloque
	if content == "" && image == "" {
		http.Error(w, "Le commentaire ne peut pas être vide", http.StatusBadRequest)
		return
	}

	createdAt := time.Now().Format("2006-01-02 15:04:05")
	log.Println("🕒 Création à :", createdAt)

	_, err = sqlite.DB.Exec(`
		INSERT INTO comments (post_id, user_id, content, image, created_at)
		VALUES (?, ?, ?, ?, ?)`,
		postID, userID, content, image, createdAt)
	if err != nil {
		log.Println("❌ Erreur insertion SQL :", err)
		http.Error(w, "Erreur base de données", http.StatusInternalServerError)
		return
	}

	log.Println("✅ Commentaire inséré avec succès.")
	w.WriteHeader(http.StatusCreated)
	fmt.Fprint(w, "Commentaire ajouté avec succès")
}

func GetCommentsByPostHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Méthode non autorisée", http.StatusMethodNotAllowed)
		return
	}

	postID := r.URL.Query().Get("id")
	if postID == "" {
		http.Error(w, "ID du post manquant", http.StatusBadRequest)
		return
	}

	rows, err := sqlite.DB.Query(`
		SELECT c.id, c.content, c.image, c.created_at,
		       u.first_name, u.last_name, u.avatar
		FROM comments c
		JOIN users u ON c.user_id = u.id
		WHERE c.post_id = ?
		ORDER BY c.created_at ASC
	`, postID)
	if err != nil {
		http.Error(w, "Erreur base de données", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type CommentWithUser struct {
		ID        int    `json:"id"`
		Content   string `json:"content"`
		ImageURL  string `json:"image_url"`
		CreatedAt string `json:"created_at"`
		Author    struct {
			FirstName string `json:"first_name"`
			LastName  string `json:"last_name"`
			Avatar    string `json:"avatar"`
		} `json:"author"`
	}

	var comments []CommentWithUser

	for rows.Next() {
		var c CommentWithUser
		err := rows.Scan(&c.ID, &c.Content, &c.ImageURL, &c.CreatedAt, &c.Author.FirstName, &c.Author.LastName, &c.Author.Avatar)
		if err != nil {
			http.Error(w, "Erreur lecture résultats", http.StatusInternalServerError)
			return
		}
		comments = append(comments, c)
	}

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	json.NewEncoder(w).Encode(comments)
}
