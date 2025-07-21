package models

type Group struct {
	ID          int    `json:"creator_id"`
	Title       string `json:"title"`
	Description string `json:"description"`
}
