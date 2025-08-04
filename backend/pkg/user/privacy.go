package user

import (
	"encoding/json"
	"net/http"

	"social-network/backend/pkg/auth"
	"social-network/backend/pkg/db/sqlite"
)

type PrivacyRequest struct {
	IsPrivate bool `json:"is_private"`
}

func TogglePrivacy(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Méthode non autorisée", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := auth.GetUserIDFromSession(w, r)
	if !ok {
		http.Error(w, "Utilisateur non authentifié", http.StatusUnauthorized)
		return
	}

	var req PrivacyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Requête invalide", http.StatusBadRequest)
		return
	}

	_, err := sqlite.DB.Exec(`UPDATE users SET is_private = ? WHERE id = ?`, req.IsPrivate, userID)
	if err != nil {
		http.Error(w, "Erreur base de données", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}
