package sqlite

import (
	"database/sql"
	"fmt"

	"social-network/backend/pkg/models"
)

func CreatePost(post models.Post, recipientIDs []int) error {
	tx, err := DB.Begin()
	if err != nil {
		return err
	}

	stmt, err := tx.Prepare(`
		INSERT INTO posts (author_id, content, image_url, privacy, created_at)
		VALUES (?, ?, ?, ?, ?)
	`)
	if err != nil {
		tx.Rollback()
		return err
	}
	defer stmt.Close()

	res, err := stmt.Exec(post.AuthorID, post.Content, post.ImageURL, post.Privacy, post.CreatedAt)
	if err != nil {
		tx.Rollback()
		fmt.Println("Erreur lors de l'insertion du post :", err)
		return err
	}

	postID, err := res.LastInsertId()
	if err != nil {
		tx.Rollback()
		return err
	}

	// Insertion dans post_permissions si custom
	if post.Privacy == "custom" {
		if len(recipientIDs) == 0 {
			tx.Rollback()
			return fmt.Errorf("aucun recipient fourni pour un post privé personnalisé")
		}

		permStmt, err := tx.Prepare("INSERT INTO post_permissions (post_id, user_id) VALUES (?, ?)")
		if err != nil {
			tx.Rollback()
			return err
		}
		defer permStmt.Close()

		for _, uid := range recipientIDs {
			_, err := permStmt.Exec(postID, uid)
			if err != nil {
				tx.Rollback()
				return err
			}
		}
	}

	return tx.Commit()
}

func GetPosts(userID int) ([]models.Post, error) {
	query := `
		SELECT 
			p.id, p.author_id, u.first_name, u.last_name, u.avatar,
			p.content, p.image_url, p.privacy, p.created_at
		FROM posts p
		JOIN users u ON p.author_id = u.id
		WHERE
			p.privacy = 'public'
			OR (p.privacy = 'followers' AND EXISTS (
				SELECT 1 FROM followers f
				WHERE f.follower_id = ? AND f.followed_id = p.author_id AND f.status = 'accepted'
			))
			OR (p.privacy = 'custom' AND EXISTS (
				SELECT 1 FROM post_permissions pp
				WHERE pp.post_id = p.id AND pp.user_id = ?
			))
		ORDER BY p.created_at DESC
	`

	rows, err := DB.Query(query, userID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	posts := []models.Post{}

	for rows.Next() {
		var firstName, lastName, avatar string
		var post models.Post
		var imageURL sql.NullString

		err := rows.Scan(
			&post.ID,
			&post.AuthorID,
			&firstName,
			&lastName,
			&avatar,
			&post.Content,
			&imageURL,
			&post.Privacy,
			&post.CreatedAt,
		)
		if err != nil {
			return nil, err
		}

		if imageURL.Valid {
			post.ImageURL = imageURL.String
		}

		post.AuthorName = firstName + " " + lastName
		post.AuthorAvatar = avatar

		posts = append(posts, post)
	}

	return posts, nil
}

type Recipient struct {
	ID     int    `json:"id"`
	Name   string `json:"name"`
	Avatar string `json:"avatar"`
}

func GetAcceptedFollowers(userID int) ([]Recipient, error) {
	query := `
	SELECT users.id, users.first_name, users.last_name, users.avatar 
	FROM followers
	JOIN users ON followers.follower_id = users.id
	WHERE followers.followed_id = ? AND followers.status = 'accepted'`

	rows, err := DB.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var recipients []Recipient
	for rows.Next() {
		var r Recipient
		var firstName, lastName string
		if err := rows.Scan(&r.ID, &firstName, &lastName, &r.Avatar); err != nil {
			return nil, err
		}
		r.Name = firstName + " " + lastName
		recipients = append(recipients, r)
	}

	return recipients, nil
}
