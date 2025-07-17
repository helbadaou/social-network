package notifications

import (
	"encoding/json"
	"log"
	"net/http"

	"social-network/backend/pkg/auth"
	"social-network/backend/pkg/db/sqlite"
)

func CreateNotification(userID, senderID int, notifType, message string) error {
	_, err := sqlite.DB.Exec(`
		INSERT INTO notifications (user_id, sender_id, type, message)
		VALUES (?, ?, ?, ?)`,
		userID, senderID, notifType, message)
	if err != nil {
		log.Println("Error inserting notification:", err)
	}
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

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(notifs); err != nil {
		log.Println("Error encoding notifications:", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
	}
}
