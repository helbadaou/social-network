package auth

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"

	// "log"

	"strconv"

	"golang.org/x/crypto/bcrypt"

	"social-network/backend/pkg/db/sqlite"
	"social-network/backend/pkg/models"
)

type RegisterRequest struct {
	Email       string `json:"email"`
	Password    string `json:"password"`
	FirstName   string `json:"first_name"`
	LastName    string `json:"last_name"`
	DateOfBirth string `json:"date_of_birth"`
	Nickname    string `json:"nickname"`
	About       string `json:"about"`
	Avatar      string `json:"avatar"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type InviteRequest struct {
	UserID  int `json:"user_id"`  // The user being invited
	GroupID int `json:"group_id"` // The group to join
}

type RespondToInviteRequest struct {
	UserID  int    `json:"user_id"`
	GroupID int    `json:"group_id"`
	Action  string `json:"action"` // "accept" or "reject"
}

type ApproveRequest struct {
	UserID int `json:"user_id"`
}

func RegisterHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	err := r.ParseMultipartForm(10 << 20) // max 10MB
	if err != nil {
		http.Error(w, "Error parsing form", http.StatusBadRequest)
		return
	}

	// Lire les champs du formulaire
	email := r.FormValue("email")
	password := r.FormValue("password")
	firstName := r.FormValue("first_name")
	lastName := r.FormValue("last_name")
	dateOfBirth := r.FormValue("date_of_birth")
	nickname := r.FormValue("nickname")
	about := r.FormValue("about")

	// Gérer l'image (optionnelle)
	var avatarPath string
	file, header, err := r.FormFile("avatar")
	if err == nil {
		defer file.Close()
		// Crée un nom unique (optionnel : hash, timestamp, etc.)
		avatarPath = "uploads/avatars/" + header.Filename

		out, err := os.Create(avatarPath)
		if err != nil {
			http.Error(w, "Unable to save file", http.StatusInternalServerError)
			return
		}
		defer out.Close()

		_, err = io.Copy(out, file)
		if err != nil {
			http.Error(w, "Failed to write file", http.StatusInternalServerError)
			return
		}
	} else {
		// Aucun fichier envoyé = avatar vide
		avatarPath = ""
	}

	// Hash du mot de passe
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Failed to hash password", http.StatusInternalServerError)
		return
	}

	// Insertion dans la DB
	stmt := `
	INSERT INTO users (email, password, first_name, last_name, date_of_birth, nickname, about, avatar)
	VALUES (?, ?, ?, ?, ?, ?, ?, ?);`

	_, err = sqlite.DB.Exec(stmt,
		email,
		string(hashedPassword),
		firstName,
		lastName,
		dateOfBirth,
		nickname,
		about,
		avatarPath,
	)
	if err != nil {
		http.Error(w, "Email already registered or DB error", http.StatusConflict)
		return
	}

	w.WriteHeader(http.StatusCreated)
	w.Write([]byte("✅ Registered successfully"))
}

func LoginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req LoginRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	var hashedPassword string
	var userID int

	query := "SELECT id, password FROM users WHERE email = ?"
	err = sqlite.DB.QueryRow(query, req.Email).Scan(&userID, &hashedPassword)
	if err != nil {
		http.Error(w, "Invalid email or password", http.StatusUnauthorized)
		return
	}

	err = bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(req.Password))
	if err != nil {
		http.Error(w, "Invalid email or password", http.StatusUnauthorized)
		return
	}

	var user models.User

	query2 := `SELECT id, email, first_name, last_name, date_of_birth, nickname, about, avatar FROM users WHERE email = ?`

	err = sqlite.DB.QueryRow(query2, req.Email).Scan(
		&user.ID, &user.Email, &user.FirstName, &user.LastName,
		&user.DateOfBirth, &user.Nickname, &user.About, &user.Avatar,
	)

	// Après récupération depuis DB
	if user.Avatar != "" {
		user.Avatar = "http://localhost:8080/" + user.Avatar
	}

	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		fmt.Println("user not found")
		return
	}

	// Set a simple cookie with user ID
	http.SetCookie(w, &http.Cookie{
		Name:     "session_id",
		Value:    fmt.Sprintf("%d", userID),
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   false, // use true if using https
	})

	w.Header().Set("Content-Type", "application/json; charset=utf-8")

	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":            user.ID,
		"email":         user.Email,
		"first_name":    user.FirstName,
		"last_name":     user.LastName,
		"date_of_birth": user.DateOfBirth,
		"nickname":      user.Nickname,
		"about":         user.About,
		"avatar":        user.Avatar, // ← IMPORTANT !
	})
}

func LogoutHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Clear cookie by setting MaxAge to -1
	http.SetCookie(w, &http.Cookie{
		Name:     "session_id",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode, // Pour s'assurer que les cookies sont bien envoyés au frontend
		Secure:   false,
	})

	w.Write([]byte("✅ Logged out successfully"))
}

////////////////////////////////////////////////////////////////////////////////

func CreateGroupHandler(db *sql.DB) http.HandlerFunc {
	log.Println("access")
	return func(w http.ResponseWriter, r *http.Request) {

		log.Println("in return")

		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var group models.Group
		log.Println("good method")
		if err := json.NewDecoder(r.Body).Decode(&group); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		log.Println("valid body")
		createdGroup, err := sqlite.CreateGroup(db, group)
		if err != nil {
			http.Error(w, "Failed to create group", http.StatusInternalServerError)
			return
		}

		log.Println("created")
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		json.NewEncoder(w).Encode(createdGroup)
	}
}

func GetGroupsHandler(dbConn *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		groups, err := sqlite.GetAllGroups(dbConn)
		if err != nil {
			http.Error(w, "Failed to fetch groups", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		json.NewEncoder(w).Encode(groups)
	}
}

////////////////////////////////////////////////////////////////////////////////

func CheckGroupAccessHandler(w http.ResponseWriter, r *http.Request) {

	fmt.Println("function accessed !")

	groupIDStr := strings.TrimPrefix(r.URL.Path, "/api/groups/")
	groupIDStr = strings.TrimSuffix(groupIDStr, "/membership")

	groupID, err := strconv.Atoi(groupIDStr)

	fmt.Println("group id is", groupID)
	if err != nil {
		http.Error(w, "Invalid group ID", http.StatusBadRequest)
		return
	}

	userID, _ := GetUserIDFromSession(r)
	if userID == 0 {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	fmt.Println("user id is", userID)

	// First, check if user is the group creator
	var creatorID int

	err = sqlite.DB.QueryRow("SELECT creator_id FROM groups WHERE id = ?", groupID).Scan(&creatorID)
	if err != nil {
		http.Error(w, "Group not found", http.StatusNotFound)
		return
	}
	if userID == creatorID {
		json.NewEncoder(w).Encode(map[string]string{"status": "creator"})
		return
	}

	// Second, check membership status
	var status string
	err = sqlite.DB.QueryRow("SELECT status FROM group_memberships WHERE group_id = ? AND user_id = ?", groupID, userID).Scan(&status)
	if err == sql.ErrNoRows {
		json.NewEncoder(w).Encode(map[string]string{"status": "none"})
		return
	} else if err != nil {
		http.Error(w, "Server error", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"status": status})
}

func JoinGroupRequestHandler(w http.ResponseWriter, r *http.Request) {

	userID, _ := GetUserIDFromSession(r)
	if userID == 0 {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	groupIDStr := strings.TrimPrefix(r.URL.Path, "/api/groups/")
	groupIDStr = strings.TrimSuffix(groupIDStr, "/membership/join")
	groupID, err := strconv.Atoi(groupIDStr)

	if err != nil {
		http.Error(w, "Invalid group ID", http.StatusBadRequest)
		return
	}

	// Check if already a member or request exists
	var exists int
	err = sqlite.DB.QueryRow(`SELECT COUNT(*) FROM group_memberships WHERE group_id = ? AND user_id = ?`, groupID, userID).Scan(&exists)
	if err != nil {
		http.Error(w, "DB error", http.StatusInternalServerError)
		return
	}
	if exists > 0 {
		http.Error(w, "Request already exists or already a member", http.StatusConflict)
		return
	}

	_, err = sqlite.DB.Exec(`
		INSERT INTO group_memberships (group_id, user_id, status)
		VALUES (?, ?, 'pending')`, groupID, userID)
	if err != nil {
		http.Error(w, "Failed to create join request", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func AcceptGroupInviteHandler(w http.ResponseWriter, r *http.Request) {

	userID, _ := GetUserIDFromSession(r) // Adjust this for your session logic

	if userID == 0 {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	groupIDStr := strings.TrimPrefix(r.URL.Path, "/api/groups/")
	groupIDStr = strings.TrimSuffix(groupIDStr, "/membership/accept")
	groupID, err := strconv.Atoi(groupIDStr)
	if err != nil {
		http.Error(w, "Invalid group ID", http.StatusBadRequest)
		return
	}

	// Only allow if user was invited
	var status string
	err = sqlite.DB.QueryRow(`
		SELECT status FROM group_memberships
		WHERE group_id = ? AND user_id = ?`, groupID, userID).Scan(&status)

	if err != nil {
		http.Error(w, "Membership not found", http.StatusNotFound)
		return
	}

	if status != "invited" {
		http.Error(w, "You are not invited", http.StatusForbidden)
		return
	}

	// Update the membership to accepted
	_, err = sqlite.DB.Exec(`
		UPDATE group_memberships 
		SET status = 'accepted' 
		WHERE group_id = ? AND user_id = ?`, groupID, userID)
	if err != nil {
		http.Error(w, "Failed to accept invitation", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func InviteToGroupHandler(w http.ResponseWriter, r *http.Request) {
	creatorID, _ := GetUserIDFromSession(r)
	if creatorID == 0 {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	groupIDStr := strings.TrimPrefix(r.URL.Path, "/api/groups/")
	groupIDStr = strings.TrimSuffix(groupIDStr, "/membership/invite")
	groupID, _ := strconv.Atoi(groupIDStr)

	// Verify current user is creator of the group
	var dbCreatorID int
	err := sqlite.DB.QueryRow(`SELECT creator_id FROM groups WHERE id = ?`, groupID).Scan(&dbCreatorID)
	if err != nil || dbCreatorID != creatorID {
		http.Error(w, "Not authorized", http.StatusForbidden)
		return
	}

	var invite InviteRequest

	err = json.NewDecoder(r.Body).Decode(&invite)
	if err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	_, err = sqlite.DB.Exec(`
		INSERT INTO group_memberships (group_id, user_id, status)
		VALUES (?, ?, 'invited')
		ON CONFLICT(group_id, user_id) DO UPDATE SET status='invited'`, groupID, invite.UserID)

	if err != nil {
		http.Error(w, "Failed to invite user", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func ApproveRequestHandler(w http.ResponseWriter, r *http.Request) {
	creatorID, _ := GetUserIDFromSession(r)
	if creatorID == 0 {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	groupIDStr := strings.TrimPrefix(r.URL.Path, "/api/groups/")
	groupIDStr = strings.TrimSuffix(groupIDStr, "/membership/approve")
	groupID, _ := strconv.Atoi(groupIDStr)

	var groupCreatorID int
	err := sqlite.DB.QueryRow(`SELECT creator_id FROM groups WHERE id = ?`, groupID).Scan(&groupCreatorID)
	if err != nil || groupCreatorID != creatorID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	var body ApproveRequest
	err = json.NewDecoder(r.Body).Decode(&body)
	if err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}

	_, err = sqlite.DB.Exec(`
		UPDATE group_memberships
		SET status = 'accepted' 
		WHERE group_id = ? AND user_id = ? AND status = 'pending'`, groupID, body.UserID)
	if err != nil {
		http.Error(w, "Failed to approve request", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func DeclineGroupInviteHandler(w http.ResponseWriter, r *http.Request) {

	userID, _ := GetUserIDFromSession(r) // Adjust this for your session logic

	if userID == 0 {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	groupIDStr := strings.TrimPrefix(r.URL.Path, "/api/groups/")
	groupIDStr = strings.TrimSuffix(groupIDStr, "/membership/decline")
	groupIDStr = strings.Trim(groupIDStr, "/")

	groupID, err := strconv.Atoi(groupIDStr)
	if err != nil {
		http.Error(w, "Invalid group ID", http.StatusBadRequest)
		return
	}

	// Remove invite or update status from "invited" to "none" in DB
	_, err = sqlite.DB.Exec("DELETE FROM group_memberships WHERE group_id = ? AND user_id = ? AND status = 'invited'", groupID, userID)
	if err != nil {
		http.Error(w, "Failed to decline invite", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func CreateGroupPostHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, _ := GetUserIDFromSession(r)
	if userID == 0 {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Parse multipart form pour gérer l'upload d'image
	err := r.ParseMultipartForm(10 << 20) // 10MB max
	if err != nil {
		http.Error(w, "Error parsing form", http.StatusBadRequest)
		return
	}

	groupIDStr := r.FormValue("group_id")
	content := r.FormValue("content")

	groupID, err := strconv.Atoi(groupIDStr)
	if err != nil {
		http.Error(w, "Invalid group ID", http.StatusBadRequest)
		return
	}

	// Vérifier que l'utilisateur est membre du groupe
	isMember, err := sqlite.IsGroupMember(sqlite.DB, groupID, userID)
	if err != nil || !isMember {
		http.Error(w, "Not authorized", http.StatusForbidden)
		return
	}

	var imagePath string
	file, header, err := r.FormFile("image")
	if err == nil {
		defer file.Close()
		imagePath = "uploads/group_posts/" + header.Filename

		out, err := os.Create(imagePath)
		if err != nil {
			http.Error(w, "Unable to save file", http.StatusInternalServerError)
			return
		}
		defer out.Close()

		_, err = io.Copy(out, file)
		if err != nil {
			http.Error(w, "Failed to write file", http.StatusInternalServerError)
			return
		}
	}

	post := models.GroupPost{
		GroupID:  groupID,
		AuthorID: userID,
		Content:  content,
		Image:    imagePath,
	}

	createdPost, err := sqlite.CreateGroupPost(sqlite.DB, post)
	if err != nil {
		http.Error(w, "Failed to create post", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(createdPost)
}

func GetGroupPostsHandler(w http.ResponseWriter, r *http.Request) {
	userID, _ := GetUserIDFromSession(r)
	if userID == 0 {
		log.Println("🔒 Utilisateur non authentifié")
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	groupIDStr := strings.TrimPrefix(r.URL.Path, "/api/groups/")
	groupIDStr = strings.TrimSuffix(groupIDStr, "/posts")
	groupID, err := strconv.Atoi(groupIDStr)
	if err != nil {
		log.Println("❌ ID de groupe invalide:", groupIDStr)
		http.Error(w, "Invalid group ID", http.StatusBadRequest)
		return
	}

	log.Printf("📥 Récupération des posts pour le groupe %d (user %d)\n", groupID, userID)

	posts, err := sqlite.GetGroupPosts(sqlite.DB, groupID, userID)
	if err != nil {
		log.Println("🔥 Erreur lors de la récupération des posts:", err)
		http.Error(w, "Failed to fetch posts", http.StatusInternalServerError)
		return
	}

	log.Printf("✅ %d posts trouvés\n", len(posts))

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(posts)
}

// ==================== COMMENTS - CORRECTION ICI ====================

func CreateGroupPostCommentHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, _ := GetUserIDFromSession(r)
	if userID == 0 {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Extraire le postID depuis l'URL
	urlParts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(urlParts) < 6 {
		http.Error(w, "Invalid URL format", http.StatusBadRequest)
		return
	}

	postIDStr := urlParts[4] // /api/groups/{groupID}/posts/{postID}/comments
	postID, err := strconv.Atoi(postIDStr)
	if err != nil {
		http.Error(w, "Invalid post ID", http.StatusBadRequest)
		return
	}

	var req models.CreateCommentRequest
	err = json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	comment := models.GroupPostComment{
		PostID:   postID, // Utiliser le postID extrait de l'URL
		AuthorID: userID,
		Content:  req.Content,
	}

	createdComment, err := sqlite.CreateGroupPostComment(sqlite.DB, comment)
	if err != nil {
		log.Printf("Erreur lors de la création du commentaire: %v", err)
		http.Error(w, "Failed to create comment", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(createdComment)
}

func GetGroupPostCommentsHandler(w http.ResponseWriter, r *http.Request) {
	userID, _ := GetUserIDFromSession(r)
	if userID == 0 {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Extraire le postID depuis l'URL
	urlParts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(urlParts) < 6 {
		http.Error(w, "Invalid URL format", http.StatusBadRequest)
		return
	}

	postIDStr := urlParts[4] // /api/groups/{groupID}/posts/{postID}/comments
	postID, err := strconv.Atoi(postIDStr)
	if err != nil {
		http.Error(w, "Invalid post ID", http.StatusBadRequest)
		return
	}

	comments, err := sqlite.GetGroupPostComments(sqlite.DB, postID, userID)
	if err != nil {
		http.Error(w, "Failed to fetch comments", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(comments)
}

// ==================== AUTRES FONCTIONS... ====================

// ==================== EVENTS ====================

// func CreateGroupEventHandler(w http.ResponseWriter, r *http.Request) {
// 	if r.Method != http.MethodPost {
// 		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
// 		return
// 	}

// 	userID, _ := GetUserIDFromSession(r)
// 	if userID == 0 {
// 		http.Error(w, "Unauthorized", http.StatusUnauthorized)
// 		return
// 	}

// 	var req models.CreateEventRequest
// 	err := json.NewDecoder(r.Body).Decode(&req)
// 	if err != nil {
// 		http.Error(w, "Invalid JSON", http.StatusBadRequest)
// 		return
// 	}

// 	// Vérifier que l'utilisateur est membre du groupe
// 	isMember, err := sqlite.IsGroupMember(sqlite.DB, req.GroupID, userID)
// 	if err != nil || !isMember {
// 		http.Error(w, "Not authorized", http.StatusForbidden)
// 		return
// 	}

// 	eventDate, err := time.Parse(time.RFC3339, req.EventDate)
// 	if err != nil {
// 		http.Error(w, "Invalid date format", http.StatusBadRequest)
// 		return
// 	}

// 	event := models.GroupEvent{
// 		GroupID:     req.GroupID,
// 		CreatorID:   userID,
// 		Title:       req.Title,
// 		Description: req.Description,
// 		EventDate:   eventDate,
// 	}

// 	createdEvent, err := sqlite.CreateGroupEvent(sqlite.DB, event)
// 	if err != nil {
// 		http.Error(w, "Failed to create event", http.StatusInternalServerError)
// 		return
// 	}

// 	w.Header().Set("Content-Type", "application/json")
// 	json.NewEncoder(w).Encode(createdEvent)
// }

// func GetGroupEventsHandler(w http.ResponseWriter, r *http.Request) {
// 	userID, _ := GetUserIDFromSession(r)
// 	if userID == 0 {
// 		http.Error(w, "Unauthorized", http.StatusUnauthorized)
// 		return
// 	}

// 	groupIDStr := strings.TrimPrefix(r.URL.Path, "/api/groups/")
// 	groupIDStr = strings.TrimSuffix(groupIDStr, "/events")
// 	groupID, err := strconv.Atoi(groupIDStr)
// 	if err != nil {
// 		http.Error(w, "Invalid group ID", http.StatusBadRequest)
// 		return
// 	}

// 	events, err := sqlite.GetGroupEvents(sqlite.DB, groupID, userID)
// 	if err != nil {
// 		http.Error(w, "Failed to fetch events", http.StatusInternalServerError)
// 		return
// 	}

// 	w.Header().Set("Content-Type", "application/json")
// 	json.NewEncoder(w).Encode(events)
// }

// func RespondToEventHandler(w http.ResponseWriter, r *http.Request) {
// 	if r.Method != http.MethodPost {
// 		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
// 		return
// 	}

// 	userID, _ := GetUserIDFromSession(r)
// 	if userID == 0 {
// 		http.Error(w, "Unauthorized", http.StatusUnauthorized)
// 		return
// 	}

// 	var req models.EventResponseRequest
// 	err := json.NewDecoder(r.Body).Decode(&req)
// 	if err != nil {
// 		http.Error(w, "Invalid JSON", http.StatusBadRequest)
// 		return
// 	}

// 	if req.Response != "going" && req.Response != "not_going" {
// 		http.Error(w, "Invalid response type", http.StatusBadRequest)
// 		return
// 	}

// 	response := models.EventResponse{
// 		EventID: req.EventID,
// 		UserID:  userID,
// 		Response: req.Response,
// 	}

// 	err = sqlite.CreateEventResponse(sqlite.DB, response)
// 	if err != nil {
// 		http.Error(w, "Failed to save response", http.StatusInternalServerError)
// 		return
// 	}

// 	w.WriteHeader(http.StatusOK)
// 	w.Write([]byte("Response saved"))
// }

// func GetEventResponsesHandler(w http.ResponseWriter, r *http.Request) {
// 	userID, _ := GetUserIDFromSession(r)
// 	if userID == 0 {
// 		http.Error(w, "Unauthorized", http.StatusUnauthorized)
// 		return
// 	}

// 	eventIDStr := strings.TrimPrefix(r.URL.Path, "/api/events/")
// 	eventIDStr = strings.TrimSuffix(eventIDStr, "/responses")
// 	eventID, err := strconv.Atoi(eventIDStr)
// 	if err != nil {
// 		http.Error(w, "Invalid event ID", http.StatusBadRequest)
// 		return
// 	}

// 	responses, err := sqlite.GetEventResponses(sqlite.DB, eventID)
// 	if err != nil {
// 		http.Error(w, "Failed to fetch responses", http.StatusInternalServerError)
// 		return
// 	}

// 	w.Header().Set("Content-Type", "application/json")
// 	json.NewEncoder(w).Encode(responses)
// }

// // ==================== PERMETTRE AUX MEMBRES D'INVITER ====================

// func UpdateInviteToGroupHandler(w http.ResponseWriter, r *http.Request) {
// 	memberID, _ := GetUserIDFromSession(r)
// 	if memberID == 0 {
// 		http.Error(w, "Unauthorized", http.StatusUnauthorized)
// 		return
// 	}

// 	groupIDStr := strings.TrimPrefix(r.URL.Path, "/api/groups/")
// 	groupIDStr = strings.TrimSuffix(groupIDStr, "/membership/invite")
// 	groupID, _ := strconv.Atoi(groupIDStr)

// 	// Vérifier que l'utilisateur est membre accepté du groupe (pas seulement créateur)
// 	isMember, err := sqlite.IsGroupMember(sqlite.DB, groupID, memberID)
// 	if err != nil || !isMember {
// 		http.Error(w, "Not authorized - must be group member", http.StatusForbidden)
// 		return
// 	}

// 	var invite InviteRequest
// 	err = json.NewDecoder(r.Body).Decode(&invite)
// 	if err != nil {
// 		http.Error(w, "Invalid request", http.StatusBadRequest)
// 		return
// 	}

// 	// Vérifier que l'utilisateur à inviter n'est pas déjà membre
// 	isAlreadyMember, _ := sqlite.IsGroupMember(sqlite.DB, groupID, invite.UserID)
// 	if isAlreadyMember {
// 		http.Error(w, "User is already a member", http.StatusConflict)
// 		return
// 	}

// 	_, err = sqlite.DB.Exec(`
// 		INSERT INTO group_memberships (group_id, user_id, status)
// 		VALUES (?, ?, 'invited')
// 		ON CONFLICT(group_id, user_id) DO UPDATE SET status='invited'`, groupID, invite.UserID)

// 	if err != nil {
// 		http.Error(w, "Failed to invite user", http.StatusInternalServerError)
// 		return
// 	}

// 	w.WriteHeader(http.StatusCreated)
// 	w.Write([]byte("User invited successfully"))
// }
