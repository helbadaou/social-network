package sqlite

import (
	"database/sql"
	"fmt"

	"social-network/backend/pkg/models"
)

func CreatePost(post models.Post) error {
	stmt, err := DB.Prepare(`
		INSERT INTO posts (author_id, content, image_url, privacy, created_at)
		VALUES (?, ?, ?, ?, ?)
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	_, err = stmt.Exec(post.AuthorID, post.Content, post.ImageURL, post.Privacy, post.CreatedAt)
	if err != nil {
		fmt.Println("Erreur lors de l'insertion du post :", err)
	}

	return err
}

func GetPosts() ([]models.Post, error) {
	rows, err := DB.Query(`
		SELECT 
			p.id, p.author_id, u.first_name, u.last_name, u.avatar,
			p.content, p.image_url, p.privacy, p.created_at
		FROM posts p
		JOIN users u ON p.author_id = u.id
		ORDER BY p.created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	posts := []models.Post{}

	for rows.Next() {
		var firstName, lastName, avatar string
		var post models.Post
		var imageURL sql.NullString // si image_url est nullable en DB

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

		// Ajoute un champ full name
		post.AuthorName = firstName + " " + lastName
		post.AuthorAvatar = avatar

		posts = append(posts, post)
	}

	return posts, nil
}
