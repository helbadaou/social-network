// search/handlers.go

package search

import (
	"encoding/json"
	"log"
	"net/http"
	"social-network/backend/pkg/db/sqlite"
	"strings"
)

type SearchResult struct {
	ID        int    `json:"id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Nickname  string `json:"nickname"`
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
