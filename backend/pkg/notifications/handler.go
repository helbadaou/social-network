package notifications

import (
	"encoding/json"
	"log"
	"net/http"

	"social-network/backend/pkg/auth"
	"social-network/backend/pkg/db/sqlite"
)

func CreateNotification(userID, senderID int, notifType, message string) error {
	// Vérifie si une notif identique existe déjà
	var count int
	err := sqlite.DB.QueryRow(`
		SELECT COUNT(*) FROM notifications
		WHERE user_id = ? AND sender_id = ? AND type = ?
	`, userID, senderID, notifType).Scan(&count)
	if err != nil {
		return err
	}
	if count > 0 {
		return nil // déjà envoyée, on ne refait rien
	}

	// Sinon, insère la notif
	_, err = sqlite.DB.Exec(`
		INSERT INTO notifications (user_id, sender_id, type, message, seen)
		VALUES (?, ?, ?, ?, 0)
	`, userID, senderID, notifType, message)
	return err
}

func GetUserNotifications(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserIDFromSession(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Toujours retourner un tableau même vide
	notifs := []map[string]interface{}{}

	rows, err := sqlite.DB.Query(`
        SELECT 
            n.id, 
            n.sender_id, 
            COALESCE(u.nickname, '') as sender_nickname,
            n.type, 
            COALESCE(n.message, '') as message,
            n.seen,
            n.created_at
        FROM notifications n
        LEFT JOIN users u ON n.sender_id = u.id
        WHERE n.user_id = ?
        ORDER BY n.created_at DESC`, userID)
	if err != nil {
		log.Println("Error querying notifications:", err)
		json.NewEncoder(w).Encode(notifs) // Retourne un tableau vide en cas d'erreur
		return
	}
	defer rows.Close()

	for rows.Next() {
		var id, sender_id int
		var sender_nickname, notifType, message string
		var seen bool
		var createdAt string

		if err := rows.Scan(&id, &sender_id, &sender_nickname, &notifType, &message, &seen, &createdAt); err != nil {
			log.Println("Error scanning notification:", err)
			continue
		}

		notifs = append(notifs, map[string]interface{}{
			"id":              id,
			"sender_id":       sender_id,
			"sender_nickname": sender_nickname,
			"type":            notifType,
			"message":         message,
			"seen":            seen,
			"created_at":      createdAt,
		})
	}

	if len(notifs) == 0 {
		notifs = []map[string]interface{}{} // Garantit un tableau vide plutôt que nil
	}

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	if err := json.NewEncoder(w).Encode(notifs); err != nil {
		log.Println("Error encoding notifications:", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
	}
}

// Dans notifications/handler.go
func MarkNotificationSeen(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := auth.GetUserIDFromSession(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req struct {
		NotificationID int  `json:"notification_id"`
		MarkAll        bool `json:"mark_all"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if req.MarkAll {
		_, err := sqlite.DB.Exec(`
            UPDATE notifications SET seen = 1
            WHERE user_id = ? AND seen = 0`,
			userID)
		if err != nil {
			http.Error(w, "DB error", http.StatusInternalServerError)
			return
		}
	} else if req.NotificationID > 0 {
		_, err := sqlite.DB.Exec(`
            UPDATE notifications SET seen = 1
            WHERE id = ? AND user_id = ?`,
			req.NotificationID, userID)
		if err != nil {
			http.Error(w, "DB error", http.StatusInternalServerError)
			return
		}
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

func DeleteNotification(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}
	userID, ok := auth.GetUserIDFromSession(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	var req struct {
		NotificationID int `json:"notification_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}
	_, err := sqlite.DB.Exec(`DELETE FROM notifications WHERE id = ? AND user_id = ?`, req.NotificationID, userID)
	if err != nil {
		http.Error(w, "DB error", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}
