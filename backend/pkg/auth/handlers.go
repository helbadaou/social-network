package auth

import (
	// "database/sql"
	"encoding/json"
	"fmt"
	"io"

	// "log"
	"net/http"
	"os"

	"golang.org/x/crypto/bcrypt"

	"social-network/backend/pkg/db/sqlite"
	"social-network/backend/pkg/models"
)

type RegisterRequest struct {
	Email       string `json:"email"`
	Password    string `json:"password"`
	FirstName   string `json:"first_name"`
	LastName    string `json:"last_name"`
	DateOfBirth string `json:"date_of_birth"`
	Nickname    string `json:"nickname"`
	About       string `json:"about"`
	Avatar      string `json:"avatar"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func RegisterHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	err := r.ParseMultipartForm(10 << 20) // max 10MB
	if err != nil {
		http.Error(w, "Error parsing form", http.StatusBadRequest)
		return
	}

	// Lire les champs du formulaire
	email := r.FormValue("email")
	password := r.FormValue("password")
	firstName := r.FormValue("first_name")
	lastName := r.FormValue("last_name")
	dateOfBirth := r.FormValue("date_of_birth")
	nickname := r.FormValue("nickname")
	about := r.FormValue("about")

	// Gérer l'image (optionnelle)
	var avatarPath string
	file, header, err := r.FormFile("avatar")
	if err == nil {
		defer file.Close()
		// Crée un nom unique (optionnel : hash, timestamp, etc.)
		avatarPath = "uploads/avatars/" + header.Filename

		out, err := os.Create(avatarPath)
		if err != nil {
			http.Error(w, "Unable to save file", http.StatusInternalServerError)
			return
		}
		defer out.Close()

		_, err = io.Copy(out, file)
		if err != nil {
			http.Error(w, "Failed to write file", http.StatusInternalServerError)
			return
		}
	} else {
		// Aucun fichier envoyé = avatar vide
		avatarPath = ""
	}

	// Hash du mot de passe
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Failed to hash password", http.StatusInternalServerError)
		return
	}

	// Insertion dans la DB
	stmt := `
	INSERT INTO users (email, password, first_name, last_name, date_of_birth, nickname, about, avatar)
	VALUES (?, ?, ?, ?, ?, ?, ?, ?);`

	_, err = sqlite.DB.Exec(stmt,
		email,
		string(hashedPassword),
		firstName,
		lastName,
		dateOfBirth,
		nickname,
		about,
		avatarPath,
	)
	if err != nil {
		http.Error(w, "Email already registered or DB error", http.StatusConflict)
		return
	}

	w.WriteHeader(http.StatusCreated)
	w.Write([]byte("✅ Registered successfully"))
}

func LoginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req LoginRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	var hashedPassword string
	var userID int

	query := "SELECT id, password FROM users WHERE email = ?"
	err = sqlite.DB.QueryRow(query, req.Email).Scan(&userID, &hashedPassword)
	if err != nil {
		http.Error(w, "Invalid email or password", http.StatusUnauthorized)
		return
	}

	err = bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(req.Password))
	if err != nil {
		http.Error(w, "Invalid email or password", http.StatusUnauthorized)
		return
	}

	var user models.User

	query2 := `SELECT id, email, first_name, last_name, date_of_birth, nickname, about, avatar FROM users WHERE email = ?`

	err = sqlite.DB.QueryRow(query2, req.Email).Scan(
		&user.ID, &user.Email, &user.FirstName, &user.LastName,
		&user.DateOfBirth, &user.Nickname, &user.About, &user.Avatar,
	)

	// Après récupération depuis DB
	if user.Avatar != "" {
		user.Avatar = "http://localhost:8080/" + user.Avatar
	}

	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		fmt.Println("user not found")
		return
	}

	// Set a simple cookie with user ID
	http.SetCookie(w, &http.Cookie{
		Name:     "session_id",
		Value:    fmt.Sprintf("%d", userID),
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   false, // use true if using https
	})

	w.Header().Set("Content-Type", "application/json")

	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":            user.ID,
		"email":         user.Email,
		"first_name":    user.FirstName,
		"last_name":     user.LastName,
		"date_of_birth": user.DateOfBirth,
		"nickname":      user.Nickname,
		"about":         user.About,
		"avatar":        user.Avatar, // ← IMPORTANT !
	})
}

func LogoutHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Clear cookie by setting MaxAge to -1
	http.SetCookie(w, &http.Cookie{
		Name:     "session_id",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode, // Pour s'assurer que les cookies sont bien envoyés au frontend
		Secure:   false,
	})

	w.Write([]byte("✅ Logged out successfully"))
}
