package repositories

import (
	"database/sql"
	"log"
	"social/models"
)

type NotificationRepository struct {
	DB *sql.DB
}

func NewNotificationRepository(db *sql.DB) *NotificationRepository {
	return &NotificationRepository{DB: db}
}

func (repo *NotificationRepository) GetNotificationsByUserID(userID int) ([]models.Notification, error) {
    rows, err := repo.DB.Query(`
        SELECT 
            n.id, 
            n.sender_id, 
            COALESCE(u.nickname, '') as sender_nickname,
            n.group_id,  -- Added this column
            n.type, 
            COALESCE(n.message, '') as message,
            n.seen,
            n.created_at
        FROM notifications n
        LEFT JOIN users u ON n.sender_id = u.id
        WHERE n.user_id = ?
        ORDER BY n.created_at DESC`, userID)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var notifications []models.Notification

    for rows.Next() {
        var notif models.Notification
        var groupID sql.NullInt64  // Use sql.NullInt64 to handle NULL values
        
        err := rows.Scan(
            &notif.ID,
            &notif.SenderID,
            &notif.SenderNickname,
            &groupID,  // Scan into NullInt64 first
            &notif.Type,
            &notif.Message,
            &notif.Seen,
            &notif.CreatedAt,
        )
        if err != nil {
            log.Println("Failed to scan notification:", err)
            continue
        }
        
        // Convert sql.NullInt64 to *int
        if groupID.Valid {
            groupIDInt := int(groupID.Int64)
            notif.GroupId = groupIDInt
        }
        
        notifications = append(notifications, notif)
    }

    return notifications, nil
}

func (r *NotificationRepository) MarkAllAsSeen(userID int) error {
	_, err := r.DB.Exec(`
        UPDATE notifications SET seen = 1 
        WHERE user_id = ? AND seen = 0`, userID)
	return err
}

func (r *NotificationRepository) MarkOneAsSeen(notificationID int, userID int) error {
	_, err := r.DB.Exec(`
        UPDATE notifications SET seen = 1 
        WHERE id = ? AND user_id = ?`, notificationID, userID)
	return err
}

// repository/notification_repository.go
func (r *NotificationRepository) DeleteNotification(userID, notificationID int) error {
	_, err := r.DB.Exec(`DELETE FROM notifications WHERE id = ? AND user_id = ?`, notificationID, userID)
	return err
}

func (r *NotificationRepository) CreateFollowRequestNotification(userID, senderID int, senderName string) error {
	_, err := r.DB.Exec(`
        INSERT INTO notifications (user_id, sender_id, type, message, created_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
		userID, senderID, "follow_request", senderName+" sent you a follow request")
	return err
}
