package models

import "time"

type Group struct {
	ID          int    `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	CreatorID   int    `json:"creator_id"`
}

type GroupMembership struct {
	ID      int    `json:"id"`
	GroupID int    `json:"group_id"`
	UserID  int    `json:"user_id"`
	Status  string `json:"status"` // "pending", "accepted", or "invited"
}


type GroupPost struct {
	ID        int       `json:"id"`
	GroupID   int       `json:"group_id"`
	AuthorID  int       `json:"author_id"`
	Content   string    `json:"content"`
	Image     string    `json:"image"`
	CreatedAt time.Time `json:"created_at"`

	// Champs calculés (join avec d'autres tables)
	AuthorName    string `json:"author_name"`
	AuthorAvatar  string `json:"author_avatar"`
	CommentsCount int    `json:"comments_count"`
}

type GroupPostComment struct {
	ID        int       `json:"id"`
	PostID    int       `json:"post_id"`
	AuthorID  int       `json:"author_id"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"created_at"`

	// Champs calculés
	AuthorName   string `json:"author_name"`
	AuthorAvatar string `json:"author_avatar"`
}

// Structures pour les événements
type GroupEvent struct {
	ID            int       `json:"id"`
	GroupID       int       `json:"group_id"`
	CreatorID     int       `json:"creator_id"`
	Title         string    `json:"title"`
	Description   string    `json:"description"`
	EventDate     time.Time `json:"event_date"`
	CreatedAt     time.Time `json:"created_at"`
	CreatorName   string    `json:"creator_name"`
	GoingCount    int       `json:"going_count"`
	NotGoingCount int       `json:"not_going_count"`
	UserResponse  string    `json:"user_response"`
}

type CreateEventRequest struct {
	GroupID     int    `json:"group_id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	EventDate   string `json:"event_date"` // Format RFC3339
}

type EventResponse struct {
	ID         int       `json:"id"`
	EventID    int       `json:"event_id"`
	UserID     int       `json:"user_id"`
	Response   string    `json:"response"` // "going" ou "not_going"
	CreatedAt  time.Time `json:"created_at"`
	UserName   string    `json:"user_name"`
	UserAvatar string    `json:"user_avatar"`
}

type EventResponseRequest struct {
	EventID  int    `json:"event_id"`
	Response string `json:"response"` // "going" ou "not_going"
}

// Requests pour les APIs
type CreateGroupPostRequest struct {
	GroupID int    `json:"group_id"`
	Content string `json:"content"`
	Image   string `json:"image,omitempty"`
}

type CreateCommentRequest struct {
	PostID  int    `json:"post_id"`
	Content string `json:"content"`
}

type GroupMessage struct {
    ID            int       `json:"id"`
    GroupID       int       `json:"groupId"`
    SenderID      int       `json:"senderId"`
    Content       string    `json:"content"`
    Timestamp     time.Time `json:"timestamp"`
    SenderNickname string   `json:"senderNickname"`
    SenderAvatar  string    `json:"senderAvatar"`
}

type GroupResponse struct {
	ID          int    `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	CreatorID   int    `json:"creator_id"`
	CreatedAt   string `json:"created_at"`
	MemberCount int    `json:"member_count"`
	IsMember    bool   `json:"is_member"`
	IsCreator   bool   `json:"is_creator"`
	IsPending   bool   `json:"is_pending"`
}

type GroupWithStatus struct {
    Group
    MemberCount int    `json:"member_count"`
    IsMember    bool   `json:"is_member"`
    IsCreator   bool   `json:"is_creator"`
    IsPending   bool   `json:"is_pending"`
}

type PendingRequest struct {
	RequestID  int    `json:"request_id"`
	UserID     int    `json:"user_id"`
	Username   string `json:"username"`
	Avatar     string `json:"avatar"`
	RequestedAt string `json:"requested_at"`
}