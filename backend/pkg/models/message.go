package models

import (
	"time"
)

type Message struct {
	ID         int       `json:"id" db:"id"`
	SenderID   int       `json:"sender_id" db:"sender_id"`
	ReceiverID *int      `json:"receiver_id" db:"receiver_id"` // null for group messages
	GroupID    *int      `json:"group_id" db:"group_id"`       // null for private messages
	Content    string    `json:"content" db:"content"`
	MessageType string   `json:"message_type" db:"message_type"` // text, emoji, image
	IsRead     bool      `json:"is_read" db:"is_read"`
	CreatedAt  time.Time `json:"created_at" db:"created_at"`
	
	// Relations
	Sender   *User  `json:"sender,omitempty"`
	Receiver *User  `json:"receiver,omitempty"`
	Group    *Group `json:"group,omitempty"`
}

type ChatRoom struct {
	ID           string    `json:"id"`
	Type         string    `json:"type"` // private, group
	Participants []User    `json:"participants"`
	LastMessage  *Message  `json:"last_message,omitempty"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type PrivateChat struct {
	User1ID      int       `json:"user1_id"`
	User2ID      int       `json:"user2_id"`
	LastMessage  *Message  `json:"last_message,omitempty"`
	UnreadCount1 int       `json:"unread_count1"` // unread messages for user1
	UnreadCount2 int       `json:"unread_count2"` // unread messages for user2
	UpdatedAt    time.Time `json:"updated_at"`
}

type GroupChat struct {
	GroupID     int       `json:"group_id"`
	LastMessage *Message  `json:"last_message,omitempty"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// WebSocket message types
const (
	MessageTypeText  = "text"
	MessageTypeEmoji = "emoji"
	MessageTypeImage = "image"
)

// Chat types
const (
	ChatTypePrivate = "private"
	ChatTypeGroup   = "group"
)