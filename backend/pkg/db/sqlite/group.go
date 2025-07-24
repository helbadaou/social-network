// db/group.go
package sqlite

import (
	"database/sql"

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
