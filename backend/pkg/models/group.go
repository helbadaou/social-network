package models

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
