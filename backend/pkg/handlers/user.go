package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"

	"social-network/pkg/middleware"
	"social-network/pkg/models"
	"social-network/pkg/utils"
)

type UserHandler struct {
	db *sql.DB
}

func NewUserHandler(db *sql.DB) *UserHandler {
	return &UserHandler{db: db}
}

func (h *UserHandler) GetUsers(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.SendErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	currentUserID := middleware.GetUserIDFromContext(r)

	// Get pagination parameters
	limit := 20
	offset := 0

	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	if o := r.URL.Query().Get("offset"); o != "" {
		if parsed, err := strconv.Atoi(o); err == nil && parsed >= 0 {
			offset = parsed
		}
	}

	users, err := models.GetUsers(h.db, currentUserID, limit, offset)
	if err != nil {
		utils.SendErrorResponse(w, "Error fetching users", http.StatusInternalServerError)
		return
	}

	utils.SendSuccessResponse(w, users)
}

func (h *UserHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.SendErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	currentUserID := middleware.GetUserIDFromContext(r)

	// Get target user ID from query parameter
	targetUserIDStr := r.URL.Query().Get("userId")
	var targetUserID int
	var err error

	if targetUserIDStr != "" {
		targetUserID, err = strconv.Atoi(targetUserIDStr)
		if err != nil {
			utils.SendErrorResponse(w, "Invalid user ID", http.StatusBadRequest)
			return
		}
	} else {
		targetUserID = currentUserID
	}

	// Get user profile
	profile, err := h.getUserProfile(targetUserID, currentUserID)
	if err != nil {
		utils.SendErrorResponse(w, "User not found", http.StatusNotFound)
		return
	}

	// Check if user can view this profile
	if profile.IsPrivate && targetUserID != currentUserID {
		// Check if current user is following target user
		isFollowing, err := h.isFollowing(currentUserID, targetUserID)
		if err != nil || !isFollowing {
			utils.SendErrorResponse(w, "Profile is private", http.StatusForbidden)
			return
		}
	}

	utils.SendSuccessResponse(w, profile)
}

func (h *UserHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		utils.SendErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	currentUserID := middleware.GetUserIDFromContext(r)

	var updateData struct {
		FirstName string `json:"firstName"`
		LastName  string `json:"lastName"`
		Avatar    string `json:"avatar"`
		Nickname  string `json:"nickname"`
		AboutMe   string `json:"aboutMe"`
		IsPrivate bool   `json:"isPrivate"`
	}

	if err := json.NewDecoder(r.Body).Decode(&updateData); err != nil {
		utils.SendErrorResponse(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// Validate names
	if err := utils.ValidateName(updateData.FirstName, "First name"); err != nil {
		utils.SendErrorResponse(w, err.Error(), http.StatusBadRequest)
		return
	}

	if err := utils.ValidateName(updateData.LastName, "Last name"); err != nil {
		utils.SendErrorResponse(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Get current user
	var user models.User
	if err := user.GetByID(h.db, currentUserID); err != nil {
		utils.SendErrorResponse(w, "User not found", http.StatusNotFound)
		return
	}

	// Update user data
	user.FirstName = updateData.FirstName
	user.LastName = updateData.LastName
	user.IsPrivate = updateData.IsPrivate

	if updateData.Avatar != "" {
		user.Avatar = &updateData.Avatar
	}
	if updateData.Nickname != "" {
		user.Nickname = &updateData.Nickname
	}
	if updateData.AboutMe != "" {
		user.AboutMe = &updateData.AboutMe
	}

	if err := user.Update(h.db); err != nil {
		utils.SendErrorResponse(w, "Error updating profile", http.StatusInternalServerError)
		return
	}

	user.PasswordHash = ""
	utils.SendSuccessResponse(w, user)
}

func (h *UserHandler) FollowUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.SendErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	currentUserID := middleware.GetUserIDFromContext(r)

	var followData struct {
		UserID int `json:"userId"`
	}

	if err := json.NewDecoder(r.Body).Decode(&followData); err != nil {
		utils.SendErrorResponse(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if followData.UserID == currentUserID {
		utils.SendErrorResponse(w, "Cannot follow yourself", http.StatusBadRequest)
		return
	}

	// Check if target user exists
	var targetUser models.User
	if err := targetUser.GetByID(h.db, followData.UserID); err != nil {
		utils.SendErrorResponse(w, "User not found", http.StatusNotFound)
		return
	}

	// Check if already following
	existing, err := h.getFollowStatus(currentUserID, followData.UserID)
	if err == nil {
		if existing.Status == "accepted" {
			utils.SendErrorResponse(w, "Already following this user", http.StatusConflict)
			return
		} else if existing.Status == "pending" {
			utils.SendErrorResponse(w, "Follow request already sent", http.StatusConflict)
			return
		}
	}

	// Create follow record
	follow := &models.Follow{
		FollowerID:  currentUserID,
		FollowingID: followData.UserID,
		Status:      "pending",
	}

	// If target user has public profile, auto-accept
	if !targetUser.IsPrivate {
		follow.Status = "accepted"
	}

	if err := follow.CreateFollow(h.db); err != nil {
		utils.SendErrorResponse(w, "Error creating follow request", http.StatusInternalServerError)
		return
	}

	// Create notification if private profile
	if targetUser.IsPrivate {
		notification := &models.Notification{
			UserID:        followData.UserID,
			Type:          "follow_request",
			Message:       "You have a new follow request",
			// RelatedUserID: &currentUserID,
		}
		notification.Create(h.db)
	}

	utils.SendMessageResponse(w, "Follow request sent successfully")
}

func (h *UserHandler) UnfollowUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.SendErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	currentUserID := middleware.GetUserIDFromContext(r)

	var unfollowData struct {
		UserID int `json:"userId"`
	}

	if err := json.NewDecoder(r.Body).Decode(&unfollowData); err != nil {
		utils.SendErrorResponse(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// Delete follow record
	query := `DELETE FROM follows WHERE follower_id = ? AND following_id = ?`
	result, err := h.db.Exec(query, currentUserID, unfollowData.UserID)
	if err != nil {
		utils.SendErrorResponse(w, "Error unfollowing user", http.StatusInternalServerError)
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		utils.SendErrorResponse(w, "Not following this user", http.StatusBadRequest)
		return
	}

	utils.SendMessageResponse(w, "Successfully unfollowed user")
}

func (h *UserHandler) GetFollowRequests(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.SendErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	currentUserID := middleware.GetUserIDFromContext(r)

	requests, err := h.getFollowRequests(currentUserID)
	if err != nil {
		utils.SendErrorResponse(w, "Error fetching follow requests", http.StatusInternalServerError)
		return
	}

	utils.SendSuccessResponse(w, requests)
}

func (h *UserHandler) RespondToFollowRequest(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.SendErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	currentUserID := middleware.GetUserIDFromContext(r)

	var responseData struct {
		FollowerID int    `json:"followerId"`
		Action     string `json:"action"` // "accept" or "reject"
	}

	if err := json.NewDecoder(r.Body).Decode(&responseData); err != nil {
		utils.SendErrorResponse(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if responseData.Action != "accept" && responseData.Action != "reject" {
		utils.SendErrorResponse(w, "Invalid action. Must be 'accept' or 'reject'", http.StatusBadRequest)
		return
	}

	if responseData.Action == "accept" {
		// Update follow status to accepted
		query := `UPDATE follows SET status = 'accepted', updated_at = CURRENT_TIMESTAMP WHERE follower_id = ? AND following_id = ? AND status = 'pending'`
		result, err := h.db.Exec(query, responseData.FollowerID, currentUserID)
		if err != nil {
			utils.SendErrorResponse(w, "Error accepting follow request", http.StatusInternalServerError)
			return
		}

		rowsAffected, _ := result.RowsAffected()
		if rowsAffected == 0 {
			utils.SendErrorResponse(w, "Follow request not found", http.StatusNotFound)
			return
		}

		utils.SendMessageResponse(w, "Follow request accepted")
	} else {
		// Delete follow request
		query := `DELETE FROM follows WHERE follower_id = ? AND following_id = ? AND status = 'pending'`
		result, err := h.db.Exec(query, responseData.FollowerID, currentUserID)
		if err != nil {
			utils.SendErrorResponse(w, "Error rejecting follow request", http.StatusInternalServerError)
			return
		}

		rowsAffected, _ := result.RowsAffected()
		if rowsAffected == 0 {
			utils.SendErrorResponse(w, "Follow request not found", http.StatusNotFound)
			return
		}

		utils.SendMessageResponse(w, "Follow request rejected")
	}
}

// Helper functions

func (h *UserHandler) getUserProfile(userID, currentUserID int) (*models.UserProfile, error) {
	var profile models.UserProfile

	// Get user basic info
	if err := profile.GetByID(h.db, userID); err != nil {
		return nil, err
	}

	// Get counts
	h.db.QueryRow("SELECT COUNT(*) FROM follows WHERE following_id = ? AND status = 'accepted'", userID).Scan(&profile.FollowersCount)
	h.db.QueryRow("SELECT COUNT(*) FROM follows WHERE follower_id = ? AND status = 'accepted'", userID).Scan(&profile.FollowingCount)
	h.db.QueryRow("SELECT COUNT(*) FROM posts WHERE user_id = ?", userID).Scan(&profile.PostsCount)

	// Get follow status
	if currentUserID != userID {
		follow, err := h.getFollowStatus(currentUserID, userID)
		if err == nil {
			profile.IsFollowing = follow.Status == "accepted"
			profile.FollowStatus = follow.Status
		} else {
			profile.FollowStatus = "none"
		}
	}

	return &profile, nil
}

func (h *UserHandler) getFollowStatus(followerID, followingID int) (*models.Follow, error) {
	var follow models.Follow
	query := `SELECT id, follower_id, following_id, status, created_at, updated_at FROM follows WHERE follower_id = ? AND following_id = ?`
	err := h.db.QueryRow(query, followerID, followingID).Scan(&follow.ID, &follow.FollowerID, &follow.FollowingID, &follow.Status, &follow.CreatedAt, &follow.UpdatedAt)
	return &follow, err
}

func (h *UserHandler) isFollowing(followerID, followingID int) (bool, error) {
	var count int
	query := `SELECT COUNT(*) FROM follows WHERE follower_id = ? AND following_id = ? AND status = 'accepted'`
	err := h.db.QueryRow(query, followerID, followingID).Scan(&count)
	return count > 0, err
}

func (h *UserHandler) getFollowRequests(userID int) ([]models.FollowRequest, error) {
	query := `
        SELECT f.id, f.follower_id, f.following_id, f.status, f.created_at, f.updated_at,
               u.id, u.email, u.first_name, u.last_name, u.avatar, u.nickname, u.about_me, u.is_private
        FROM follows f
        JOIN users u ON f.follower_id = u.id
        WHERE f.following_id = ? AND f.status = 'pending'
        ORDER BY f.created_at DESC
    `

	rows, err := h.db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var requests []models.FollowRequest
	for rows.Next() {
		var req models.FollowRequest
		err := rows.Scan(
			&req.ID, &req.FollowerID, &req.FollowingID, &req.Status, &req.CreatedAt, &req.UpdatedAt,
			&req.FollowerUser.ID, &req.FollowerUser.Email, &req.FollowerUser.FirstName, &req.FollowerUser.LastName,
			&req.FollowerUser.Avatar, &req.FollowerUser.Nickname, &req.FollowerUser.AboutMe, &req.FollowerUser.IsPrivate,
		)
		if err != nil {
			return nil, err
		}
		requests = append(requests, req)
	}

	return requests, nil
}

// Add this to your existing models/user.go file

// func (f *Follow) Create(db *sql.DB) error {
// 	query := `
//         INSERT INTO follows (follower_id, following_id, status)
//         VALUES (?, ?, ?)
//     `
// 	result, err := db.Exec(query, f.FollowerID, f.FollowingID, f.Status)
// 	if err != nil {
// 		return err
// 	}

// 	id, err := result.LastInsertId()
// 	if err != nil {
// 		return err
// 	}

// 	f.ID = int(id)
// 	return nil
// }

// func (f *Follow) Update(db *sql.DB) error {
// 	query := `
//         UPDATE follows 
//         SET status = ?, updated_at = CURRENT_TIMESTAMP
//         WHERE id = ?
//     `
// 	_, err := db.Exec(query, f.Status, f.ID)
// 	return err
// }

// func (f *Follow) Delete(db *sql.DB) error {
// 	query := `DELETE FROM follows WHERE id = ?`
// 	_, err := db.Exec(query, f.ID)
// 	return err
// }
