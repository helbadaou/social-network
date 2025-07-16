package user

import (
	"encoding/json"
	"net/http"
	"social-network/backend/pkg/db/sqlite"
	"strconv"
)

type PrivacyRequest struct {
	IsPrivate bool `json:"is_private"`
}

func TogglePrivacy(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Méthode non autorisée", http.StatusMethodNotAllowed)
		return
	}

	cookie, err := r.Cookie("session_id")
	if err != nil {
		http.Error(w, "Utilisateur non authentifié", http.StatusUnauthorized)
		return
	}

	userID, err := strconv.Atoi(cookie.Value)
	if err != nil {
		http.Error(w, "ID utilisateur invalide", http.StatusBadRequest)
		return
	}

	var req PrivacyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Requête invalide", http.StatusBadRequest)
		return
	}

	_, err = sqlite.DB.Exec(`UPDATE users SET is_private = ? WHERE id = ?`, req.IsPrivate, userID)
	if err != nil {
		http.Error(w, "Erreur base de données", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}