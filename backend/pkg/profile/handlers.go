// profile/handlers.go

package profile

import (
	"encoding/json"
	"net/http"
	"social-network/backend/pkg/db/sqlite"
	"social-network/backend/pkg/models"
	"strconv"
	"strings"
	// "fmt"
)

func ProfileHandler(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("session_id")
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	userID := cookie.Value

	var user models.User

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
