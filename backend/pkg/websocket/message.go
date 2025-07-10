package websocket

import (
	"time"
)

// WSMessage represents a websocket message
type WSMessage struct {
	Type         string      `json:"type"`
	SenderID     int         `json:"sender_id"`
	SenderName   string      `json:"sender_name"`
	SenderAvatar string      `json:"sender_avatar"`
	ReceiverID   int         `json:"receiver_id,omitempty"`
	GroupID      int         `json:"group_id,omitempty"`
	Content      string      `json:"content"`
	MessageType  string      `json:"message_type"` // text, emoji, image
	Timestamp    time.Time   `json:"timestamp"`
	Data         interface{} `json:"data,omitempty"`
}

// WebSocket message types
const (
	WSMessageTypePrivateMessage = "private_message"
	WSMessageTypeGroupMessage   = "group_message"
	WSMessageTypeTyping         = "typing"
	WSMessageTypeMarkRead       = "mark_read"
	WSMessageTypeNotification   = "notification"
	WSMessageTypeUserOnline     = "user_online"
	WSMessageTypeUserOffline    = "user_offline"
)

// Message content types
const (
	MessageContentTypeText  = "text"
	MessageContentTypeEmoji = "emoji"
	MessageContentTypeImage = "image"
)

// TypingData represents typing indicator data
type TypingData struct {
	IsTyping   bool `json:"is_typing"`
	ReceiverID int  `json:"receiver_id,omitempty"`
	GroupID    int  `json:"group_id,omitempty"`
}

// NotificationData represents notification data
type NotificationData struct {
	ID      int    `json:"id"`
	Type    string `json:"type"`
	Title   string `json:"title"`
	Message string `json:"message"`
}

// OnlineStatusData represents online status data
type OnlineStatusData struct {
	UserID   int    `json:"user_id"`
	Username string `json:"username"`
	Avatar   string `json:"avatar"`
	Status   string `json:"status"` // online, offline
}

// ChatRoomData represents chat room information
type ChatRoomData struct {
	RoomID       string `json:"room_id"`
	Type         string `json:"type"` // private, group
	Name         string `json:"name"`
	Avatar       string `json:"avatar,omitempty"`
	LastMessage  string `json:"last_message,omitempty"`
	UnreadCount  int    `json:"unread_count"`
	Participants []int  `json:"participants,omitempty"`
}

// MessageDeliveryData represents message delivery confirmation
type MessageDeliveryData struct {
	MessageID int    `json:"message_id"`
	Status    string `json:"status"` // sent, delivered, read
}

// Helper functions to create specific message types
func NewPrivateMessage(senderID, receiverID int, content, messageType string) *WSMessage {
	return &WSMessage{
		Type:        WSMessageTypePrivateMessage,
		SenderID:    senderID,
		ReceiverID:  receiverID,
		Content:     content,
		MessageType: messageType,
		Timestamp:   time.Now(),
	}
}

func NewGroupMessage(senderID, groupID int, content, messageType string) *WSMessage {
	return &WSMessage{
		Type:        WSMessageTypeGroupMessage,
		SenderID:    senderID,
		GroupID:     groupID,
		Content:     content,
		MessageType: messageType,
		Timestamp:   time.Now(),
	}
}

func NewTypingIndicator(senderID int, isTyping bool, receiverID, groupID int) *WSMessage {
	data := TypingData{
		IsTyping:   isTyping,
		ReceiverID: receiverID,
		GroupID:    groupID,
	}
	
	return &WSMessage{
		Type:      WSMessageTypeTyping,
		SenderID:  senderID,
		Timestamp: time.Now(),
		Data:      data,
	}
}

func NewNotificationMessage(userID int, notificationID int, notificationType, title, message string) *WSMessage {
	data := NotificationData{
		ID:      notificationID,
		Type:    notificationType,
		Title:   title,
		Message: message,
	}
	
	return &WSMessage{
		Type:      WSMessageTypeNotification,
		SenderID:  userID,
		Timestamp: time.Now(),
		Data:      data,
	}
}

func NewOnlineStatusMessage(userID int, username, avatar, status string) *WSMessage {
	data := OnlineStatusData{
		UserID:   userID,
		Username: username,
		Avatar:   avatar,
		Status:   status,
	}
	
	return &WSMessage{
		Type:      WSMessageTypeUserOnline,
		Timestamp: time.Now(),
		Data:      data,
	}
}