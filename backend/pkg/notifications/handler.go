package notifications

import (
	"encoding/json"
	"net/http"

	"social-network/backend/pkg/auth"
	"social-network/backend/pkg/db/sqlite"
)

func CreateNotification(userID, senderID int, notifType, message string) error {
	_, err := sqlite.DB.Exec(`
		INSERT INTO notifications (user_id, sender_id, type, message)
		VALUES (?, ?, ?, ?)`,
		userID, senderID, notifType, message)
	return err
}

func GetUserNotifications(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserIDFromSession(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	rows, err := sqlite.DB.Query(`
		SELECT id, from_user_id, type, message, is_read, created_at
		FROM notifications
		WHERE user_id = ?
		ORDER BY created_at DESC`, userID)
	if err != nil {
		http.Error(w, "DB error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var notifs []map[string]interface{}
	for rows.Next() {
		var id, fromID int
		var notifType, message string
		var isRead bool
		var createdAt string

		err := rows.Scan(&id, &fromID, &notifType, &message, &isRead, &createdAt)
		if err != nil {
			continue
		}

		notifs = append(notifs, map[string]interface{}{
			"id":         id,
			"from_user":  fromID,
			"type":       notifType,
			"message":    message,
			"is_read":    isRead,
			"created_at": createdAt,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(notifs)
}
