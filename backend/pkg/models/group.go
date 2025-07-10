package models

import (
	"time"
)

type Group struct {
	ID          int       `json:"id" db:"id"`
	Title       string    `json:"title" db:"title"`
	Description string    `json:"description" db:"description"`
	CreatorID   int       `json:"creator_id" db:"creator_id"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
	
	// Relations
	Creator *User `json:"creator,omitempty"`
	Members []User `json:"members,omitempty"`
	MemberCount int `json:"member_count,omitempty"`
}

type GroupMember struct {
	ID       int    `json:"id" db:"id"`
	GroupID  int    `json:"group_id" db:"group_id"`
	UserID   int    `json:"user_id" db:"user_id"`
	Status   string `json:"status" db:"status"` // pending, accepted, declined
	Role     string `json:"role" db:"role"`     // member, admin, creator
	JoinedAt time.Time `json:"joined_at" db:"joined_at"`
	
	// Relations
	Group *Group `json:"group,omitempty"`
	User  *User  `json:"user,omitempty"`
}

type GroupPost struct {
	ID        int       `json:"id" db:"id"`
	GroupID   int       `json:"group_id" db:"group_id"`
	UserID    int       `json:"user_id" db:"user_id"`
	Content   string    `json:"content" db:"content"`
	ImagePath string    `json:"image_path" db:"image_path"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	
	// Relations
	Group  *Group `json:"group,omitempty"`
	Author *User  `json:"author,omitempty"`
}

type GroupInvitation struct {
	ID       int       `json:"id" db:"id"`
	GroupID  int       `json:"group_id" db:"group_id"`
	UserID   int       `json:"user_id" db:"user_id"`
	InviterID int      `json:"inviter_id" db:"inviter_id"`
	Status   string    `json:"status" db:"status"` // pending, accepted, declined
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	
	// Relations
	Group   *Group `json:"group,omitempty"`
	User    *User  `json:"user,omitempty"`
	Inviter *User  `json:"inviter,omitempty"`
}

type GroupJoinRequest struct {
	ID        int       `json:"id" db:"id"`
	GroupID   int       `json:"group_id" db:"group_id"`
	UserID    int       `json:"user_id" db:"user_id"`
	Status    string    `json:"status" db:"status"` // pending, accepted, declined
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	
	// Relations
	Group *Group `json:"group,omitempty"`
	User  *User  `json:"user,omitempty"`
}


