package models


type Message struct {
	From      int    `json:"from"`
	To        int    `json:"to"`
	Content   string `json:"content"`
	Type      string `json:"type"` // e.g. "private"
	Timestamp string `json:"timestamp"`
}