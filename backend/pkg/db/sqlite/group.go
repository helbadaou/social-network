// db/group.go
package sqlite

import (
	"database/sql"
	"log"
	"time"

	"social-network/backend/pkg/models"
)

func GetAllGroups(db *sql.DB) ([]models.Group, error) {
	rows, err := db.Query("SELECT id, title, description FROM groups")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var groups []models.Group
	for rows.Next() {
		var g models.Group
		if err := rows.Scan(&g.ID, &g.Title, &g.Description); err != nil {
			return nil, err
		}
		groups = append(groups, g)
	}
	return groups, nil
}

func CreateGroup(db *sql.DB, group models.Group) (models.Group, error) {
	result, err := db.Exec(`
        INSERT INTO groups (title, description, creator_id)
        VALUES (?, ?, ?)`,
		group.Title, group.Description, group.CreatorID)
	if err != nil {
		return models.Group{}, err
	}
	id, err := result.LastInsertId()
	if err != nil {
		return models.Group{}, err
	}
	group.ID = int(id)
	return group, nil
}

func CreateGroupPost(db *sql.DB, post models.GroupPost) (models.GroupPost, error) {
	result, err := db.Exec(`
        INSERT INTO group_posts (group_id, author_id, content, image)
        VALUES (?, ?, ?, ?)`,
		post.GroupID, post.AuthorID, post.Content, post.Image)
	if err != nil {
		return models.GroupPost{}, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return models.GroupPost{}, err
	}

	post.ID = int(id)
	post.CreatedAt = time.Now()
	return post, nil
}

func GetGroupPosts(db *sql.DB, groupID int, userID int) ([]models.GroupPost, error) {
	log.Println("GetGroupPosts - groupID:", groupID)

	// Vérifier que l'utilisateur est membre du groupe
	var memberCount int
	err := db.QueryRow(`
		SELECT 1 FROM group_membership 
		WHERE group_id = ? AND user_id = ? AND status = 'accepted'
		UNION
		SELECT 1 FROM groups WHERE id = ? AND creator_id = ?`,
		groupID, userID, groupID, userID).Scan(&memberCount)

	if err != nil || memberCount == 0 {
		log.Println("Erreur dans la requête SQL:", err)
		return nil, err // Utilisateur pas autorisé
	}

	rows, err := db.Query(`
		SELECT gp.id, gp.group_id, gp.author_id, gp.content, gp.image, gp.created_at,
			   u.first_name || ' ' || u.last_name as author_name, u.avatar,
			   COUNT(gpc.id) as comments_count
		FROM group_posts gp
		JOIN users u ON gp.author_id = u.id
		LEFT JOIN group_post_comments gpc ON gp.id = gpc.post_id
		WHERE gp.group_id = ?
		GROUP BY gp.id
		ORDER BY gp.created_at DESC`,
		groupID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var posts []models.GroupPost
	for rows.Next() {
		var post models.GroupPost
		err := rows.Scan(
			&post.ID, &post.GroupID, &post.AuthorID, &post.Content, &post.Image, &post.CreatedAt,
			&post.AuthorName, &post.AuthorAvatar, &post.CommentsCount,
		)
		if err != nil {
			log.Println("Erreur lors du scan d'un post:", err)
			return nil, err
		}
		log.Printf("📦 Post ID %d lu\n", post.ID)

		// Traiter l'avatar
		if post.AuthorAvatar != "" {
			post.AuthorAvatar = "http://localhost:8080/" + post.AuthorAvatar
		}

		posts = append(posts, post)
	}

	return posts, nil
}

// ==================== COMMENTS ====================

func CreateGroupPostComment(db *sql.DB, comment models.GroupPostComment) (models.GroupPostComment, error) {
	result, err := db.Exec(`
        INSERT INTO group_post_comments (post_id, author_id, content)
        VALUES (?, ?, ?)`,
		comment.PostID, comment.AuthorID, comment.Content)
	if err != nil {
		return models.GroupPostComment{}, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return models.GroupPostComment{}, err
	}

	comment.ID = int(id)
	comment.CreatedAt = time.Now()
	return comment, nil
}

func GetGroupPostComments(db *sql.DB, postID int, userID int) ([]models.GroupPostComment, error) {
	// Vérifier que l'utilisateur peut voir ce post
	var groupID int
	err := db.QueryRow(`SELECT group_id FROM group_posts WHERE id = ?`, postID).Scan(&groupID)
	if err != nil {
		return nil, err
	}

	var memberCount int
	err = db.QueryRow(`
		SELECT COUNT(*) FROM group_membership 
		WHERE group_id = ? AND user_id = ? AND status = 'accepted'
		UNION ALL
		SELECT COUNT(*) FROM groups WHERE id = ? AND creator_id = ?`,
		groupID, userID, groupID, userID).Scan(&memberCount)

	if err != nil || memberCount == 0 {
		return nil, err
	}

	rows, err := db.Query(`
		SELECT gpc.id, gpc.post_id, gpc.author_id, gpc.content, gpc.created_at,
			   u.first_name || ' ' || u.last_name as author_name, u.avatar
		FROM group_post_comments gpc
		JOIN users u ON gpc.author_id = u.id
		WHERE gpc.post_id = ?
		ORDER BY gpc.created_at ASC`,
		postID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var comments []models.GroupPostComment
	for rows.Next() {
		var comment models.GroupPostComment
		err := rows.Scan(
			&comment.ID, &comment.PostID, &comment.AuthorID, &comment.Content, &comment.CreatedAt,
			&comment.AuthorName, &comment.AuthorAvatar,
		)
		if err != nil {
			return nil, err
		}

		if comment.AuthorAvatar != "" {
			comment.AuthorAvatar = "http://localhost:8080/" + comment.AuthorAvatar
		}

		comments = append(comments, comment)
	}

	return comments, nil
}

// ==================== EVENTS ====================

// func CreateGroupEvent(db *sql.DB, event models.GroupEvent) (models.GroupEvent, error) {
// 	result, err := db.Exec(`
//         INSERT INTO group_events (group_id, creator_id, title, description, event_date)
//         VALUES (?, ?, ?, ?, ?)`,
// 		event.GroupID, event.CreatorID, event.Title, event.Description, event.EventDate)
// 	if err != nil {
// 		return models.GroupEvent{}, err
// 	}

// 	id, err := result.LastInsertId()
// 	if err != nil {
// 		return models.GroupEvent{}, err
// 	}

// 	event.ID = int(id)
// 	event.CreatedAt = time.Now()
// 	return event, nil
// }

// func GetGroupEvents(db *sql.DB, groupID int, userID int) ([]models.GroupEvent, error) {
// 	// Vérifier membership
// 	var memberCount int
// 	err := db.QueryRow(`
// 		SELECT COUNT(*) FROM group_membership
// 		WHERE group_id = ? AND user_id = ? AND status = 'accepted'
// 		UNION ALL
// 		SELECT COUNT(*) FROM groups WHERE id = ? AND creator_id = ?`,
// 		groupID, userID, groupID, userID).Scan(&memberCount)

// 	if err != nil || memberCount == 0 {
// 		return nil, err
// 	}

// 	rows, err := db.Query(`
// 		SELECT ge.id, ge.group_id, ge.creator_id, ge.title, ge.description,
// 			   ge.event_date, ge.created_at,
// 			   u.first_name || ' ' || u.last_name as creator_name,
// 			   COUNT(CASE WHEN er.response = 'going' THEN 1 END) as going_count,
// 			   COUNT(CASE WHEN er.response = 'not_going' THEN 1 END) as not_going_count,
// 			   MAX(CASE WHEN er.user_id = ? THEN er.response END) as user_response
// 		FROM group_events ge
// 		JOIN users u ON ge.creator_id = u.id
// 		LEFT JOIN event_responses er ON ge.id = er.event_id
// 		WHERE ge.group_id = ?
// 		GROUP BY ge.id
// 		ORDER BY ge.event_date ASC`,
// 		userID, groupID)

// 	if err != nil {
// 		return nil, err
// 	}
// 	defer rows.Close()

// 	var events []models.GroupEvent
// 	for rows.Next() {
// 		var event models.GroupEvent
// 		var userResponse sql.NullString
// 		err := rows.Scan(
// 			&event.ID, &event.GroupID, &event.CreatorID, &event.Title, &event.Description,
// 			&event.EventDate, &event.CreatedAt, &event.CreatorName,
// 			&event.GoingCount, &event.NotGoingCount, &userResponse,
// 		)
// 		if err != nil {
// 			return nil, err
// 		}

// 		if userResponse.Valid {
// 			event.UserResponse = userResponse.String
// 		}

// 		events = append(events, event)
// 	}

// 	return events, nil
// }

// func CreateEventResponse(db *sql.DB, response models.EventResponse) error {
// 	_, err := db.Exec(`
// 		INSERT INTO event_responses (event_id, user_id, response)
// 		VALUES (?, ?, ?)
// 		ON CONFLICT(event_id, user_id) DO UPDATE SET response = ?, created_at = CURRENT_TIMESTAMP`,
// 		response.EventID, response.UserID, response.Response, response.Response)
// 	return err
// }

// func GetEventResponses(db *sql.DB, eventID int) ([]models.EventResponse, error) {
// 	rows, err := db.Query(`
// 		SELECT er.id, er.event_id, er.user_id, er.response, er.created_at,
// 			   u.first_name || ' ' || u.last_name as user_name, u.avatar
// 		FROM event_responses er
// 		JOIN users u ON er.user_id = u.id
// 		WHERE er.event_id = ?
// 		ORDER BY er.created_at DESC`,
// 		eventID)

// 	if err != nil {
// 		return nil, err
// 	}
// 	defer rows.Close()

// 	var responses []models.EventResponse
// 	for rows.Next() {
// 		var resp models.EventResponse
// 		err := rows.Scan(
// 			&resp.ID, &resp.EventID, &resp.UserID, &resp.Response, &resp.CreatedAt,
// 			&resp.UserName, &resp.UserAvatar,
// 		)
// 		if err != nil {
// 			return nil, err
// 		}

// 		if resp.UserAvatar != "" {
// 			resp.UserAvatar = "http://localhost:8080/" + resp.UserAvatar
// 		}

// 		responses = append(responses, resp)
// 	}

// 	return responses, nil
// }

// Vérifier si un utilisateur est membre d'un groupe
func IsGroupMember(db *sql.DB, groupID int, userID int) (bool, error) {
	var count int
	err := db.QueryRow(`
		SELECT COUNT(*) FROM (
			SELECT 1 FROM group_membership 
			WHERE group_id = ? AND user_id = ? AND status = 'accepted'
			UNION ALL
			SELECT 1 FROM groups WHERE id = ? AND creator_id = ?
		)`, groupID, userID, groupID, userID).Scan(&count)

	return count > 0, err
}
