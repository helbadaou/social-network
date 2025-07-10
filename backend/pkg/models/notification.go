package models

import (
	"time"
    "database/sql"

)

type Notification struct {
	ID        int       `json:"id" db:"id"`
	UserID    int       `json:"user_id" db:"user_id"`
	Type      string    `json:"type" db:"type"`
	Title     string    `json:"title" db:"title"`
	Message   string    `json:"message" db:"message"`
	IsRead    bool      `json:"is_read" db:"is_read"`
	Data      string    `json:"data" db:"data"` // JSON string for additional data
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	
	// Relations
	User *User `json:"user,omitempty"`
}

// Notification types
const (
	NotificationTypeFollowRequest  = "follow_request"
	NotificationTypeFollowAccepted = "follow_accepted"
	NotificationTypeGroupInvite    = "group_invite"
	NotificationTypeGroupJoinRequest = "group_join_request"
	NotificationTypeGroupEvent     = "group_event"
	NotificationTypePostLike       = "post_like"
	NotificationTypePostComment    = "post_comment"
	NotificationTypeGroupPostLike  = "group_post_like"
	NotificationTypeGroupPostComment = "group_post_comment"
)

type NotificationData struct {
	UserID    int    `json:"user_id,omitempty"`
	GroupID   int    `json:"group_id,omitempty"`
	PostID    int    `json:"post_id,omitempty"`
	EventID   int    `json:"event_id,omitempty"`
	RequestID int    `json:"request_id,omitempty"`
	UserName  string `json:"user_name,omitempty"`
	GroupName string `json:"group_name,omitempty"`
	PostTitle string `json:"post_title,omitempty"`
	EventTitle string `json:"event_title,omitempty"`
}


func (n *Notification) Create(db *sql.DB) error {
	_, err := db.Exec(`
		INSERT INTO notifications (user_id, type, title, message, data, is_read, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, n.UserID, n.Type, n.Title, n.Message, n.Data, false, time.Now())
	return err
}


// Helper functions for creating notifications
func CreateFollowRequestNotification(userID, requesterID int, requesterName string) *Notification {
	return &Notification{
		UserID:  userID,
		Type:    NotificationTypeFollowRequest,
		Title:   "New Follow Request",
		Message: requesterName + " wants to follow you",
		IsRead:  false,
	}
}

func CreateFollowAcceptedNotification(userID, accepterID int, accepterName string) *Notification {
	return &Notification{
		UserID:  userID,
		Type:    NotificationTypeFollowAccepted,
		Title:   "Follow Request Accepted",
		Message: accepterName + " accepted your follow request",
		IsRead:  false,
	}
}

func CreateGroupInviteNotification(userID, groupID int, groupName, inviterName string) *Notification {
	return &Notification{
		UserID:  userID,
		Type:    NotificationTypeGroupInvite,
		Title:   "Group Invitation",
		Message: inviterName + " invited you to join " + groupName,
		IsRead:  false,
	}
}

func CreateGroupJoinRequestNotification(userID, groupID int, groupName, requesterName string) *Notification {
	return &Notification{
		UserID:  userID,
		Type:    NotificationTypeGroupJoinRequest,
		Title:   "Group Join Request",
		Message: requesterName + " wants to join " + groupName,
		IsRead:  false,
	}
}

func CreateGroupEventNotification(userID, eventID int, eventTitle, groupName string) *Notification {
	return &Notification{
		UserID:  userID,
		Type:    NotificationTypeGroupEvent,
		Title:   "New Event",
		Message: "New event '" + eventTitle + "' in " + groupName,
		IsRead:  false,
	}
}