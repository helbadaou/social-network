package notifications

import (
	"database/sql"
	"time"
)

type Notification struct {
	ID         int       `json:"id"`
	SenderID   int       `json:"sender_id"`
	ReceiverID int       `json:"receiver_id"`
	Message    string    `json:"message"`
	Type       string    `json:"type"`
	Seen       bool      `json:"seen"`
	Accepted   *bool     `json:"accepted"` // Pointer pour gérer NULL
	CreatedAt  time.Time `json:"created_at"`
}

func CreateNotification(db *sql.DB, senderID, receiverID int, message, notifType string) error {
	_, err := db.Exec(`
        INSERT INTO notifications (sender_id, receiver_id, message, type)
        VALUES (?, ?, ?, ?)
    `, senderID, receiverID, message, notifType)
	return err
}

func MarkNotificationAs(db *sql.DB, notifID int, accepted bool) error {
	_, err := db.Exec(`
        UPDATE notifications 
        SET seen = TRUE, accepted = ?
        WHERE id = ?
    `, accepted, notifID)
	return err
}

func GetUserNotifications(db *sql.DB, userID int) ([]Notification, error) {
	rows, err := db.Query(`
        SELECT id, sender_id, receiver_id, message, type, seen, accepted, created_at
        FROM notifications
        WHERE receiver_id = ? AND (accepted IS NULL OR accepted = TRUE)
        ORDER BY created_at DESC
    `, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var notifs []Notification
	for rows.Next() {
		var n Notification
		var accepted sql.NullBool
		err := rows.Scan(&n.ID, &n.SenderID, &n.ReceiverID, &n.Message, &n.Type, &n.Seen, &accepted, &n.CreatedAt)
		if err != nil {
			return nil, err
		}
		if accepted.Valid {
			n.Accepted = &accepted.Bool
		}
		notifs = append(notifs, n)
	}
	return notifs, nil
}
