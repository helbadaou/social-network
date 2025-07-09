package models

import (
    "database/sql"
    "time"
)

type Post struct {
    ID           int       `json:"id"`
    UserID       int       `json:"userId"`
    Content      string    `json:"content"`
    ImagePath    *string   `json:"imagePath"`
    PrivacyLevel string    `json:"privacyLevel"`
    CreatedAt    time.Time `json:"createdAt"`
    UpdatedAt    time.Time `json:"updatedAt"`
    
    // Additional fields for display
    Author       User        `json:"author"`
    LikesCount   int         `json:"likesCount"`
    IsLiked      bool        `json:"isLiked"`
    Comments     []Comment   `json:"comments"`
    CommentsCount int        `json:"commentsCount"`
}

type Comment struct {
    ID        int       `json:"id"`
    PostID    int       `json:"postId"`
    UserID    int       `json:"userId"`
    Content   string    `json:"content"`
    ImagePath *string   `json:"imagePath"`
    CreatedAt time.Time `json:"createdAt"`
    UpdatedAt time.Time `json:"updatedAt"`
    
    // Additional fields for display
    Author User `json:"author"`
}

type PostCreate struct {
    Content         string   `json:"content"`
    ImagePath       string   `json:"imagePath,omitempty"`
    PrivacyLevel    string   `json:"privacyLevel"`
    AllowedUserIDs  []int    `json:"allowedUserIds,omitempty"`
}

func (p *Post) Create(db *sql.DB) error {
    query := `
        INSERT INTO posts (user_id, content, image_path, privacy_level)
        VALUES (?, ?, ?, ?)
    `
    result, err := db.Exec(query, p.UserID, p.Content, p.ImagePath, p.PrivacyLevel)
    if err != nil {
        return err
    }
    
    id, err := result.LastInsertId()
    if err != nil {
        return err
    }
    
    p.ID = int(id)
    return nil
}

func (p *Post) SetPrivacySettings(db *sql.DB, allowedUserIDs []int) error {
    // First, delete existing privacy settings
    _, err := db.Exec("DELETE FROM post_privacy_settings WHERE post_id = ?", p.ID)
    if err != nil {
        return err
    }
    
    // Insert new privacy settings
    for _, userID := range allowedUserIDs {
        _, err := db.Exec("INSERT INTO post_privacy_settings (post_id, allowed_user_id) VALUES (?, ?)", p.ID, userID)
        if err != nil {
            return err
        }
    }
    
    return nil
}

func GetPosts(db *sql.DB, currentUserID int, limit, offset int) ([]Post, error) {
    query := `
        SELECT DISTINCT p.id, p.user_id, p.content, p.image_path, p.privacy_level, p.created_at, p.updated_at,
               u.first_name, u.last_name, u.avatar, u.nickname,
               (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as likes_count,
               (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id AND user_id = ?) as is_liked,
               (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count
        FROM posts p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN follows f ON p.user_id = f.following_id AND f.follower_id = ? AND f.status = 'accepted'
        WHERE 
            p.privacy_level = 'public' OR
            p.user_id = ? OR
            (p.privacy_level = 'almost_private' AND f.id IS NOT NULL) OR
            (p.privacy_level = 'private' AND p.id IN (
                SELECT post_id FROM post_privacy_settings WHERE allowed_user_id = ?
            ))
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
    `
    
    rows, err := db.Query(query, currentUserID, currentUserID, currentUserID, currentUserID, limit, offset)
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    
    var posts []Post
    for rows.Next() {
        var p Post
        err := rows.Scan(
            &p.ID, &p.UserID, &p.Content, &p.ImagePath, &p.PrivacyLevel, &p.CreatedAt, &p.UpdatedAt,
            &p.Author.FirstName, &p.Author.LastName, &p.Author.Avatar, &p.Author.Nickname,
            &p.LikesCount, &p.IsLiked, &p.CommentsCount,
        )
        if err != nil {
            return nil, err
        }
        p.Author.ID = p.UserID
        posts = append(posts, p)
    }
    
    return posts, nil
}

func (c *Comment) Create(db *sql.DB) error {
    query := `
        INSERT INTO comments (post_id, user_id, content, image_path)
        VALUES (?, ?, ?, ?)
    `
    result, err := db.Exec(query, c.PostID, c.UserID, c.Content, c.ImagePath)
    if err != nil {
        return err
    }
    
    id, err := result.LastInsertId()
    if err != nil {
        return err
    }
    
    c.ID = int(id)
    return nil
}

func GetCommentsByPostID(db *sql.DB, postID int) ([]Comment, error) {
    query := `
        SELECT c.id, c.post_id, c.user_id, c.content, c.image_path, c.created_at, c.updated_at,
               u.first_name, u.last_name, u.avatar, u.nickname
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.post_id = ?
        ORDER BY c.created_at ASC
    `
    
    rows, err := db.Query(query, postID)
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    
    var comments []Comment
    for rows.Next() {
        var c Comment
        err := rows.Scan(
            &c.ID, &c.PostID, &c.UserID, &c.Content, &c.ImagePath, &c.CreatedAt, &c.UpdatedAt,
            &c.Author.FirstName, &c.Author.LastName, &c.Author.Avatar, &c.Author.Nickname,
        )
        if err != nil {
            return nil, err
        }
        c.Author.ID = c.UserID
        comments = append(comments, c)
    }
    
    return comments, nil
}

func LikePost(db *sql.DB, postID, userID int) error {
    query := `INSERT OR IGNORE INTO post_likes (post_id, user_id) VALUES (?, ?)`
    _, err := db.Exec(query, postID, userID)
    return err
}

func UnlikePost(db *sql.DB, postID, userID int) error {
    query := `DELETE FROM post_likes WHERE post_id = ? AND user_id = ?`
    _, err := db.Exec(query, postID, userID)
    return err
}