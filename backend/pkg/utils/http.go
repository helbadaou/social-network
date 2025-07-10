package utils

import (
	"encoding/json"
	"net/http"
)

// WriteError envoie une réponse JSON contenant un message d'erreur
func WriteError(w http.ResponseWriter, statusCode int, message string) {
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(map[string]string{
		"error": message,
	})
}

// WriteJSON envoie une réponse JSON générique
func WriteJSON(w http.ResponseWriter, statusCode int, data interface{}) {
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(data)
}
