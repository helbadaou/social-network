package auth

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"

	"golang.org/x/crypto/bcrypt"

	"social-network/backend/pkg/db/sqlite"
)

type User struct {
	ID          int
	Email       string
	Password    string
	FirstName   string
	LastName    string
	DateOfBirth string
	Nickname    string
	About       string
	Avatar      string
}

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

type FollowRequest struct {
	FollowerID int `json:"follower_id"` // current user (sender)
	FollowedID int `json:"followed_id"` // target user
}

type SearchResult struct {
	ID        int    `json:"id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Nickname  string `json:"nickname"`
}

type ChatUser struct {
	ID       int    `json:"id"`
	FullName string `json:"full_name"`
	Avatar   string `json:"avatar"`
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

	var user User

	query2 := `SELECT id, email, first_name, last_name, date_of_birth, nickname, about, avatar FROM users WHERE email = ?`

	err = sqlite.DB.QueryRow(query2, req.Email).Scan(
		&user.ID, &user.Email, &user.FirstName, &user.LastName,
		&user.DateOfBirth, &user.Nickname, &user.About, &user.Avatar,
	)
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
		// Secure: true, // use this when using https
	})

	w.Write([]byte("✅ Logged in successfully"))
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
	})

	w.Write([]byte("✅ Logged out successfully"))
}

func ProfileHandler(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("session_id")
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	userID := cookie.Value
 
	var user User

	query := `SELECT id, email, first_name, last_name, date_of_birth, nickname, about, avatar FROM users WHERE id = ?`

	err = sqlite.DB.QueryRow(query, userID).Scan(
		&user.ID, &user.Email, &user.FirstName, &user.LastName,
		&user.DateOfBirth, &user.Nickname, &user.About, &user.Avatar)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}
 
	w.Header().Set("Content-Type", "application/json")
	 
	json.NewEncoder(w).Encode(user)
}

func SearchUsersHandler(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("query")
	if query == "" {
		http.Error(w, "Missing search query", http.StatusBadRequest)
		return
	}

	search := "%" + strings.ToLower(query) + "%"

	rows, err := sqlite.DB.Query(`
		SELECT id, first_name, last_name, nickname
		FROM users
		WHERE LOWER(first_name) LIKE ? OR LOWER(last_name) LIKE ? OR LOWER(nickname) LIKE ?
	`, search, search, search)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var results []SearchResult
	for rows.Next() {
		var u SearchResult
		if err := rows.Scan(&u.ID, &u.FirstName, &u.LastName, &u.Nickname); err != nil {
			log.Println("Erreur lors du scan d’un utilisateur :", err)
			continue
		}
		results = append(results, u)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(results)
}

func SendFollowRequest(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	cookie, err := r.Cookie("session_id")
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	id, err := strconv.Atoi(cookie.Value)
	if err != nil {
		http.Error(w, "Invalid session ID", http.StatusBadRequest)
		return
	}

	followerID := id

	// Get followed_id from JSON body
	var req struct {
		FollowedID int `json:"followed_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}
	// fmt.Printf("🔍 Body reçu: %+v\n", req)
	// fmt.Println("▶ Followed ID reçu:", req.FollowedID)
	// fmt.Println("▶ Follower ID (depuis cookie):", followerID)

	// Check if follow already exists
	var exists int

	err = sqlite.DB.QueryRow(
		`SELECT COUNT(*) FROM followers WHERE follower_id = ? AND followed_id = ?`,
		followerID, req.FollowedID,
	).Scan(&exists)
	if err != nil {
		http.Error(w, "DB error", http.StatusInternalServerError)
		return
	}

	if exists > 0 {
		// http.Error(w, "Follow request already sent", http.StatusConflict)
		return
	}

	// Check if followed user is public or private
	var isPrivate bool
	err = sqlite.DB.QueryRow(`SELECT is_private FROM users WHERE id = ?`, req.FollowedID).Scan(&isPrivate)
	if err != nil {
		// fmt.Println("❌ Erreur SQL SELECT is_private:", err)
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	status := "pending"
	if !isPrivate {
		status = "accepted"
	}

	_, err = sqlite.DB.Exec(`
		INSERT INTO followers (follower_id, followed_id, status)
		VALUES (?, ?, ?)`, followerID, req.FollowedID, status)
	if err != nil {
		http.Error(w, "Insert error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	fmt.Fprint(w, "Follow request sent")
}

func GetFollowStatus(w http.ResponseWriter, r *http.Request) {
	userIDStr := strings.TrimPrefix(r.URL.Path, "/api/follow/status/")
	followedID, err := strconv.Atoi(userIDStr)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	cookie, err := r.Cookie("session_id")
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	followerID := cookie.Value

	var status string
	err = sqlite.DB.QueryRow(`
		SELECT status FROM followers WHERE follower_id = ? AND followed_id = ?
	`, followerID, followedID).Scan(&status)

	if err == sql.ErrNoRows {
		w.WriteHeader(http.StatusNoContent)
		return
	} else if err != nil {
		http.Error(w, "DB error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status": status,
	})
}

// Dans auth/handlers.go ou un nouveau fichier

func GetUserByIDHandler(w http.ResponseWriter, r *http.Request) {
	idStr := strings.TrimPrefix(r.URL.Path, "/api/users/")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	db := sqlite.GetDB()
	var user struct {
		ID          int    `json:"id"`
		FirstName   string `json:"first_name"`
		LastName    string `json:"last_name"`
		Nickname    string `json:"nickname"`
		Email       string `json:"email"`
		About       string `json:"about"`
		Avatar      string `json:"avatar"`
		DateOfBirth string `json:"date_of_birth"`
	}

	row := db.QueryRow(`SELECT id, first_name, last_name, nickname, email, about, avatar, date_of_birth FROM users WHERE id = ?`, id)
	err = row.Scan(&user.ID, &user.FirstName, &user.LastName, &user.Nickname, &user.Email, &user.About, &user.Avatar, &user.DateOfBirth)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	// w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

func GetAllChatUsers(w http.ResponseWriter, r *http.Request) {
	rows, err := sqlite.DB.Query(`SELECT id, first_name, last_name, avatar FROM users`)
	if err != nil {
		http.Error(w, "Failed to fetch users", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var users []ChatUser

	for rows.Next() {
		var id int
		var firstName, lastName, avatar string

		if err := rows.Scan(&id, &firstName, &lastName, &avatar); err != nil {
			continue
		}

		fullName := firstName + " " + lastName
		users = append(users, ChatUser{
			ID:       id,
			FullName: fullName,
			Avatar:   avatar,
		})
	}

	if len(users) > 0 {
		fmt.Println("users are", users)
	} else {
		fmt.Println("no users available")
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}


