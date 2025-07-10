package models

import "time"

type Post struct {
    ID        int       `json:"id"`
    AuthorID  int       `json:"author_id"`
    AuthorName string    `json:"author_name"`
    Content   string    `json:"content"`
    ImageURL  string    `json:"image_url,omitempty"`
    AuthorAvatar string `json:"author_avatar"`
    Privacy   string    `json:"privacy"` // "public", "followers", "custom"
    CreatedAt time.Time `json:"created_at"`
}
