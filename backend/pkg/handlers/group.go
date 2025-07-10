package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"social-network/pkg/models"
	"social-network/pkg/utils"
)


type GroupHandler struct {
	DB *sql.DB
}

func NewGroupHandler(db *sql.DB) *GroupHandler {
	return &GroupHandler{DB: db}
}



// CreateGroup handles group creation
func (h *AuthHandler) CreateGroup(w http.ResponseWriter, r *http.Request) {
	user, ok := r.Context().Value("user").(*models.User)
	if !ok {
		utils.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req struct {
		Title       string `json:"title"`
		Description string `json:"description"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate input
	if req.Title == "" {
		utils.WriteError(w, http.StatusBadRequest, "Title is required")
		return
	}

	// Create group
	query := `
		INSERT INTO groups (title, description, creator_id, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?)
	`
	now := time.Now()
	result, err := h.db.Exec(query, req.Title, req.Description, user.ID, now, now)
	if err != nil {
		utils.WriteError(w, http.StatusInternalServerError, "Failed to create group")
		return
	}

	groupID, _ := result.LastInsertId()

	// Add creator as member
	memberQuery := `
		INSERT INTO group_members (group_id, user_id, status, role, joined_at)
		VALUES (?, ?, 'accepted', 'creator', ?)
	`
	_, err = h.db.Exec(memberQuery, groupID, user.ID, now)
	if err != nil {
		utils.WriteError(w, http.StatusInternalServerError, "Failed to add creator as member")
		return
	}

	// Get created group
	group, err := h.getGroupByID(int(groupID))
	if err != nil {
		utils.WriteError(w, http.StatusInternalServerError, "Failed to retrieve created group")
		return
	}

	utils.WriteJSON(w, http.StatusCreated, group)
}

// GetGroups handles getting all groups
func (h *AuthHandler) GetGroups(w http.ResponseWriter, r *http.Request) {
	query := `
		SELECT g.id, g.title, g.description, g.creator_id, g.created_at, g.updated_at,
			   u.username, u.first_name, u.last_name, u.avatar,
			   COUNT(gm.user_id) as member_count
		FROM groups g
		LEFT JOIN users u ON g.creator_id = u.id
		LEFT JOIN group_members gm ON g.id = gm.group_id AND gm.status = 'accepted'
		GROUP BY g.id
		ORDER BY g.created_at DESC
	`

	rows, err := h.db.Query(query)
	if err != nil {
		utils.WriteError(w, http.StatusInternalServerError, "Failed to fetch groups")
		return
	}
	defer rows.Close()

	var groups []models.Group
	for rows.Next() {
		var group models.Group
		var creator models.User
		
		err := rows.Scan(
			&group.ID, &group.Title, &group.Description, &group.CreatorID,
			&group.CreatedAt, &group.UpdatedAt,
			&creator.Nickname, &creator.FirstName, &creator.LastName, &creator.Avatar,
			&group.MemberCount,
		)
		if err != nil {
			utils.WriteError(w, http.StatusInternalServerError, "Failed to scan group")
			return
		}

		creator.ID = group.CreatorID
		group.Creator = &creator
		groups = append(groups, group)
	}

	utils.WriteJSON(w, http.StatusOK, groups)
}

// GetGroup handles getting a specific group
func (h *AuthHandler) GetGroup(w http.ResponseWriter, r *http.Request) {
	groupID, err := strconv.Atoi(r.URL.Query().Get("id"))
	if err != nil {
		utils.WriteError(w, http.StatusBadRequest, "Invalid group ID")
		return
	}

	group, err := h.getGroupByID(groupID)
	if err != nil {
		if err == sql.ErrNoRows {
			utils.WriteError(w, http.StatusNotFound, "Group not found")
			return
		}
		utils.WriteError(w, http.StatusInternalServerError, "Failed to fetch group")
		return
	}

	utils.WriteJSON(w, http.StatusOK, group)
}

// JoinGroup handles group join requests
func (h *AuthHandler) JoinGroup(w http.ResponseWriter, r *http.Request) {
	user, ok := r.Context().Value("user").(*models.User)
	if !ok {
		utils.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	groupID, err := strconv.Atoi(r.URL.Query().Get("id"))
	if err != nil {
		utils.WriteError(w, http.StatusBadRequest, "Invalid group ID")
		return
	}

	// Check if user is already a member or has pending request
	checkQuery := `
		SELECT COUNT(*) FROM group_members 
		WHERE group_id = ? AND user_id = ?
	`
	var count int
	err = h.db.QueryRow(checkQuery, groupID, user.ID).Scan(&count)
	if err != nil {
		utils.WriteError(w, http.StatusInternalServerError, "Failed to check membership")
		return
	}

	if count > 0 {
		utils.WriteError(w, http.StatusConflict, "Already a member or request pending")
		return
	}

	// Add join request
	query := `
		INSERT INTO group_members (group_id, user_id, status, role, joined_at)
		VALUES (?, ?, 'pending', 'member', ?)
	`
	_, err = h.db.Exec(query, groupID, user.ID, time.Now())
	if err != nil {
		utils.WriteError(w, http.StatusInternalServerError, "Failed to create join request")
		return
	}

	// Create notification for group creator
	group, _ := h.getGroupByID(groupID)
	if group != nil {
		h.CreateGroupJoinRequestNotification(h.db, groupID, group.CreatorID)

	}

	utils.WriteJSON(w, http.StatusOK, map[string]string{"message": "Join request sent"})
}

// InviteToGroup handles group invitations
func (h *AuthHandler) InviteToGroup(w http.ResponseWriter, r *http.Request) {
	user, ok := r.Context().Value("user").(*models.User)
	if !ok {
		utils.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req struct {
		GroupID int `json:"group_id"`
		UserID  int `json:"user_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Check if user is member of the group
	if !h.isGroupMember(req.GroupID, user.ID) {
		utils.WriteError(w, http.StatusForbidden, "You are not a member of this group")
		return
	}

	// Check if invited user exists
	// invitedUser, err := h.getUserByID(req.UserID)
	// if err != nil {
	// 	utils.WriteError(w, http.StatusNotFound, "User not found")
	// 	return
	// }

	// Check if user is already a member
	if h.isGroupMember(req.GroupID, req.UserID) {
		utils.WriteError(w, http.StatusConflict, "User is already a member")
		return
	}

	// Add invitation
	// query := `
	// 	INSERT INTO group_members (group_id, user_id, status, role, joined_at)
	// 	VALUES (?, ?, 'invited', 'member', ?)
	// `
	// _, err = h.db.Exec(query, req.GroupID, req.UserID, time.Now())
	// if err != nil {
	// 	utils.WriteError(w, http.StatusInternalServerError, "Failed to send invitation")
	// 	return
	// }

	// Create notification
	group, _ := h.getGroupByID(req.GroupID)
	if group != nil {
		h.CreateGroupJoinRequestNotification(h.db, req.GroupID, group.CreatorID)

	}

	utils.WriteJSON(w, http.StatusOK, map[string]string{"message": "Invitation sent"})
}

// AcceptGroupInvitation handles accepting group invitations
func (h *AuthHandler) AcceptGroupInvitation(w http.ResponseWriter, r *http.Request) {
	user, ok := r.Context().Value("user").(*models.User)
	if !ok {
		utils.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	groupID, err := strconv.Atoi(r.URL.Query().Get("id"))
	if err != nil {
		utils.WriteError(w, http.StatusBadRequest, "Invalid group ID")
		return
	}

	// Update invitation status
	query := `
		UPDATE group_members 
		SET status = 'accepted', joined_at = ?
		WHERE group_id = ? AND user_id = ? AND status IN ('invited', 'pending')
	`
	result, err := h.db.Exec(query, time.Now(), groupID, user.ID)
	if err != nil {
		utils.WriteError(w, http.StatusInternalServerError, "Failed to accept invitation")
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		utils.WriteError(w, http.StatusNotFound, "No pending invitation found")
		return
	}

	utils.WriteJSON(w, http.StatusOK, map[string]string{"message": "Invitation accepted"})
}

// GetGroupMembers handles getting group members
func (h *AuthHandler) GetGroupMembers(w http.ResponseWriter, r *http.Request) {
	groupID, err := strconv.Atoi(r.URL.Query().Get("id"))
	if err != nil {
		utils.WriteError(w, http.StatusBadRequest, "Invalid group ID")
		return
	}

	query := `
		SELECT u.id, u.username, u.first_name, u.last_name, u.avatar,
			   gm.role, gm.joined_at
		FROM group_members gm
		JOIN users u ON gm.user_id = u.id
		WHERE gm.group_id = ? AND gm.status = 'accepted'
		ORDER BY gm.joined_at ASC
	`

	rows, err := h.db.Query(query, groupID)
	if err != nil {
		utils.WriteError(w, http.StatusInternalServerError, "Failed to fetch members")
		return
	}
	defer rows.Close()

	var members []models.GroupMember
	for rows.Next() {
		var member models.GroupMember
		var user models.User

		err := rows.Scan(
			&user.ID, &user.Nickname, &user.FirstName, &user.LastName, &user.Avatar,
			&member.Role, &member.JoinedAt,
		)
		if err != nil {
			utils.WriteError(w, http.StatusInternalServerError, "Failed to scan member")
			return
		}

		member.User = &user
		member.GroupID = groupID
		members = append(members, member)
	}

	utils.WriteJSON(w, http.StatusOK, members)
}

// Helper functions
func (h *AuthHandler) getGroupByID(groupID int) (*models.Group, error) {
	query := `
		SELECT g.id, g.title, g.description, g.creator_id, g.created_at, g.updated_at,
			   u.username, u.first_name, u.last_name, u.avatar
		FROM groups g
		LEFT JOIN users u ON g.creator_id = u.id
		WHERE g.id = ?
	`

	var group models.Group
	var creator models.User

	err := h.db.QueryRow(query, groupID).Scan(
		&group.ID, &group.Title, &group.Description, &group.CreatorID,
		&group.CreatedAt, &group.UpdatedAt,
		&creator.Nickname, &creator.FirstName, &creator.LastName, &creator.Avatar,
	)
	if err != nil {
		return nil, err
	}

	creator.ID = group.CreatorID
	group.Creator = &creator

	return &group, nil
}

func (h *AuthHandler) isGroupMember(groupID, userID int) bool {
	query := `
		SELECT COUNT(*) FROM group_members 
		WHERE group_id = ? AND user_id = ? AND status = 'accepted'
	`
	var count int
	h.db.QueryRow(query, groupID, userID).Scan(&count)
	return count > 0
}

func (h *AuthHandler) getUserByID(userID int) (*models.User, error) {
	query := `
		SELECT id, username, first_name, last_name, email, avatar
		FROM users WHERE id = ?
	`

	var user models.User
	err := h.db.QueryRow(query, userID).Scan(
		&user.ID, &user.Nickname, &user.FirstName, &user.LastName,
		&user.Email, &user.Avatar,
	)
	if err != nil {
		return nil, err
	}

	return &user, nil
}

func (h *AuthHandler) CreateGroupJoinRequestNotification(db *sql.DB, groupID, userID int) error {
	// Récupérer le groupe pour trouver le créateur
	var group models.Group
	err := db.QueryRow(`SELECT id, title, creator_id FROM groups WHERE id = ?`, groupID).
		Scan(&group.ID, &group.Title, &group.CreatorID)
	if err != nil {
		return fmt.Errorf("unable to find group: %v", err)
	}

	// Créer la notification à destination du créateur
	data, _ := json.Marshal(map[string]interface{}{
		"group_id": groupID,
		"user_id":  userID,
	})
	notification := &models.Notification{
		UserID:  group.CreatorID,
		Type:    models.NotificationTypeGroupJoinRequest,
		Title:   "Nouvelle demande d'adhésion au groupe",
		Message: fmt.Sprintf("Un utilisateur souhaite rejoindre le groupe %s", group.Title),
		Data:    string(data),
		IsRead:  false,
		CreatedAt: time.Now(),
	}

	return notification.Create(db)
}