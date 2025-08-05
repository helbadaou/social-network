package repositories

import (
	"database/sql"
	"social/models"
	"time"
)

type ChatRepository struct {
	DB *sql.DB
}

// NewChatRepository creates a new ChatRepository with the given DB connection
func NewChatRepository(db *sql.DB) *ChatRepository {
	return &ChatRepository{DB: db}
}

// GetAllUsers returns all users with their privacy info and follow status related to requesterID.
func (r *ChatRepository) GetAllUsers(requesterID int) ([]models.ChatUser, error) {
	rows, err := r.DB.Query(`SELECT id, first_name, last_name, avatar, is_private FROM users`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []models.ChatUser

	for rows.Next() {
		var id int
		var firstName, lastName, avatar string
		var isPrivate bool

		if err := rows.Scan(&id, &firstName, &lastName, &avatar, &isPrivate); err != nil {
			continue
		}

		fullName := firstName + " " + lastName
		user := models.ChatUser{
			ID:        id,
			FullName:  fullName,
			Avatar:    avatar,
			IsPrivate: isPrivate,
		}

		// Fetch follow status if not self
		if id != requesterID {
			var status string
			err := r.DB.QueryRow(`SELECT status FROM followers WHERE follower_id = ? AND followed_id = ?`, requesterID, id).Scan(&status)
			if err == nil {
				user.FollowStatus = status
			} else {
				user.FollowStatus = ""
			}
		}

		users = append(users, user)
	}

	return users, nil
}

func (r *ChatRepository) CanUsersChat(userID1, userID2 int) (bool, error) {
	// Vérifier si user1 suit user2 ET user2 suit user1 (suivi mutuel)
	var count int
	err := r.DB.QueryRow(`
		SELECT COUNT(*) FROM followers 
		WHERE (follower_id = ? AND followed_id = ? AND status = 'accepted')
		AND EXISTS (
			SELECT 1 FROM followers 
			WHERE follower_id = ? AND followed_id = ? AND status = 'accepted'
		)
	`, userID1, userID2, userID2, userID1).Scan(&count)
	if err != nil {
		return false, err
	}

	return count > 0, nil
}

func (r *ChatRepository) GetChatHistory(userID, otherID int) ([]models.Message, error) {
	rows, err := r.DB.Query(`
		SELECT from_id, to_id, content, type, timestamp
		FROM messages
		WHERE (from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?)
		ORDER BY timestamp ASC
	`, userID, otherID, otherID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var messages []models.Message
	for rows.Next() {
		var msg models.Message
		var ts string
		if err := rows.Scan(&msg.From, &msg.To, &msg.Content, &msg.Type, &ts); err != nil {
			continue
		}
		// Parse timestamp string to time.Time
		t, err := time.Parse(time.RFC3339, ts)
		if err != nil {
			t = time.Time{}
		}
		msg.Timestamp = t.Format(time.RFC3339)
		messages = append(messages, msg)
	}
	return messages, nil
}
