package auth

import (
	"encoding/json"
	"fmt"
	"net/http"
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

func RegisterHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req RegisterRequest

	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Failed to hash password", http.StatusInternalServerError)
		return
	}

	stmt := `
	INSERT INTO users (email, password, first_name, last_name, date_of_birth, nickname, about, avatar)
	VALUES (?, ?, ?, ?, ?, ?, ?, ?);`

	_, err = sqlite.DB.Exec(stmt,
		req.Email,
		string(hashedPassword),
		req.FirstName,
		req.LastName,
		req.DateOfBirth,
		req.Nickname,
		req.About,
		req.Avatar,
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

	// query := `SELECT email, first_name, last_name, date_of_birth, nickname, about, avatar FROM users WHERE id = ?`
	// var email, firstName, lastName, dob, nickname, about, avatar string

	// err = sqlite.DB.QueryRow(query, userID).Scan(&email, &firstName, &lastName, &dob, &nickname, &about, &avatar)

	var user User

	query := `SELECT id, email, first_name, last_name, date_of_birth, nickname, about, avatar FROM users WHERE id = ?`

	err = sqlite.DB.QueryRow(query, userID).Scan(
		&user.ID, &user.Email, &user.FirstName, &user.LastName,
		&user.DateOfBirth, &user.Nickname, &user.About, &user.Avatar)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	// resp := map[string]string{
	// 	"email":         email,
	// 	"first_name":    firstName,
	// 	"last_name":     lastName,
	// 	"date_of_birth": dob,
	// 	"nickname":      nickname,
	// 	"about":         about,
	// 	"avatar":        avatar,
	// }

	// jsonResp, _ := json.Marshal(resp)
	w.Header().Set("Content-Type", "application/json")
	// w.Write(jsonResp)
	json.NewEncoder(w).Encode(user)
}

func SearchUsers(w http.ResponseWriter, r *http.Request) {
	query := strings.ToLower(r.URL.Query().Get("query"))
	if query == "" {
		http.Error(w, "Missing query", http.StatusBadRequest)
		return
	}

	rows, err := sqlite.DB.Query(`
		SELECT id, first_name, last_name, nickname
		FROM users
		WHERE LOWER(first_name) LIKE ? OR LOWER(last_name) LIKE ? OR LOWER(nickname) LIKE ?
	`, "%"+query+"%", "%"+query+"%", "%"+query+"%")
	if err != nil {
		http.Error(w, "DB error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var users []map[string]string
	for rows.Next() {
		var id int
		var first, last, nick string
		rows.Scan(&id, &first, &last, &nick)
		users = append(users, map[string]string{
			"id":         string(rune(id)),
			"first_name": first,
			"last_name":  last,
			"nickname":   nick,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}

func SendFollowRequest(w http.ResponseWriter, r *http.Request) {
	var req FollowRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// Check if already sent
	var exists int
	query := `
        SELECT COUNT(*) FROM followers 
        WHERE follower_id = ? AND followed_id = ?;
    `
	err = sqlite.DB.QueryRow(query, req.FollowerID, req.FollowedID).Scan(&exists)
	if err != nil {
		http.Error(w, "DB error", http.StatusInternalServerError)
		return
	}
	if exists > 0 {
		http.Error(w, "Already sent follow request", http.StatusConflict)
		return
	}

	// Insert follow request
	stmt := `
        INSERT INTO followers (follower_id, followed_id, status) 
        VALUES (?, ?, 'pending');
    `
	_, err = sqlite.DB.Exec(stmt, req.FollowerID, req.FollowedID)
	if err != nil {
		http.Error(w, "Could not send follow request", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	w.Write([]byte("Follow request sent ✅"))
}