package auth

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	// "log"

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
	UserID  int `json:"userId"`  // The user being invited
 
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

func GetNonGroupMembersHandler(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	groupIDStr := strings.TrimPrefix(r.URL.Path, "/api/groups/")
	groupIDStr = strings.TrimSuffix(groupIDStr, "/non-members")

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

	rows, err := db.Query(`
			SELECT id, nickname FROM users
			WHERE id NOT IN (
				SELECT user_id FROM group_memberships WHERE group_id = ?
			)
			AND id != ?`, groupID, userID)
	if err != nil {
		http.Error(w, "DB error", 500)
		return
	}
	defer rows.Close()

	var users []map[string]interface{}
	for rows.Next() {
		var id int
		var username string
		if err := rows.Scan(&id, &username); err == nil {
			users = append(users, map[string]interface{}{
				"id":       id,
				"username": username,
			})
		}
	}

	json.NewEncoder(w).Encode(users)
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
	groupIDStr = strings.TrimSuffix(groupIDStr, "/invite")
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
	fmt.Println("invited id", invite)

	_, err = sqlite.DB.Exec(`
		INSERT INTO group_memberships (group_id, user_id, status)
		VALUES (?, ?, 'invited')
		ON CONFLICT(group_id, user_id) DO UPDATE SET status='invited'`, groupID, invite.UserID)
	if err != nil {
		http.Error(w, "Failed to invite user", http.StatusInternalServerError)
		return
	}
fmt.Println("invited added to db")

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

	// Récupérer les informations complètes de l'auteur
	var fullPost models.GroupPost
	err = sqlite.DB.QueryRow(`
        SELECT gp.id, gp.group_id, gp.author_id, gp.content, gp.image, gp.created_at,
               u.nickname as author_name, u.avatar as author_avatar
        FROM group_posts gp
        JOIN users u ON gp.author_id = u.id
        WHERE gp.id = ?`, createdPost.ID).Scan(
		&fullPost.ID, &fullPost.GroupID, &fullPost.AuthorID, &fullPost.Content,
		&fullPost.Image, &fullPost.CreatedAt, &fullPost.AuthorName, &fullPost.AuthorAvatar,
	)
	if err != nil {
		http.Error(w, "Failed to fetch post details", http.StatusInternalServerError)
		return
	}

	// Formater l'URL de l'avatar si nécessaire
	if fullPost.AuthorAvatar != "" {
		fullPost.AuthorAvatar = "http://localhost:8080/" + fullPost.AuthorAvatar
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(fullPost)
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

	// Récupérer les informations complètes de l'auteur
	var fullComment models.GroupPostComment
	err = sqlite.DB.QueryRow(`
        SELECT gpc.id, gpc.post_id, gpc.author_id, gpc.content, gpc.created_at,
               u.nickname as author_name, u.avatar as author_avatar
        FROM group_post_comments gpc
        JOIN users u ON gpc.author_id = u.id
        WHERE gpc.id = ?`, createdComment.ID).Scan(
		&fullComment.ID, &fullComment.PostID, &fullComment.AuthorID, &fullComment.Content,
		&fullComment.CreatedAt, &fullComment.AuthorName, &fullComment.AuthorAvatar,
	)
	if err != nil {
		http.Error(w, "Failed to fetch comment details", http.StatusInternalServerError)
		return
	}

	// Formater l'URL de l'avatar si nécessaire
	if fullComment.AuthorAvatar != "" {
		fullComment.AuthorAvatar = "http://localhost:8080/" + fullComment.AuthorAvatar
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(fullComment)
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
		log.Printf("Erreur lors de la récupération des commentaires: %v", err)
		http.Error(w, "Failed to fetch comments", http.StatusInternalServerError)
		return
	}

	if comments == nil {
		comments = []models.GroupPostComment{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(comments)
}

// ==================== EVENTS ====================

func CreateGroupEventHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, _ := GetUserIDFromSession(r)
	if userID == 0 {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req models.CreateEventRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// Vérifier que l'utilisateur est membre du groupe
	isMember, err := sqlite.IsGroupMember(sqlite.DB, req.GroupID, userID)
	if err != nil || !isMember {
		http.Error(w, "Not authorized", http.StatusForbidden)
		return
	}

	eventDate, err := time.Parse(time.RFC3339, req.EventDate)
	if err != nil {
		http.Error(w, "Invalid date format", http.StatusBadRequest)
		return
	}

	event := models.GroupEvent{
		GroupID:     req.GroupID,
		CreatorID:   userID,
		Title:       req.Title,
		Description: req.Description,
		EventDate:   eventDate,
	}

	createdEvent, err := sqlite.CreateGroupEvent(sqlite.DB, event)
	if err != nil {
		http.Error(w, "Failed to create event", http.StatusInternalServerError)
		return
	}

	// Récupérer les informations complètes du créateur
	var fullEvent models.GroupEvent
	err = sqlite.DB.QueryRow(`
        SELECT ge.id, ge.group_id, ge.creator_id, ge.title, ge.description,
               ge.event_date, ge.created_at,
               u.first_name || ' ' || u.last_name as creator_name
        FROM group_events ge
        JOIN users u ON ge.creator_id = u.id
        WHERE ge.id = ?`, createdEvent.ID).Scan(
		&fullEvent.ID, &fullEvent.GroupID, &fullEvent.CreatorID, &fullEvent.Title,
		&fullEvent.Description, &fullEvent.EventDate, &fullEvent.CreatedAt, &fullEvent.CreatorName,
	)
	if err != nil {
		http.Error(w, "Failed to fetch event details", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(fullEvent)
}

func GetGroupEventsHandler(w http.ResponseWriter, r *http.Request) {
	userID, _ := GetUserIDFromSession(r)
	if userID == 0 {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	groupIDStr := strings.TrimPrefix(r.URL.Path, "/api/groups/")
	groupIDStr = strings.TrimSuffix(groupIDStr, "/events")
	groupID, err := strconv.Atoi(groupIDStr)
	if err != nil {
		http.Error(w, "Invalid group ID", http.StatusBadRequest)
		return
	}

	// Vérifier que l'utilisateur est membre du groupe
	isMember, err := sqlite.IsGroupMember(sqlite.DB, groupID, userID)
	if err != nil {
		http.Error(w, "Failed to check membership", http.StatusInternalServerError)
		return
	}
	if !isMember {
		// Retourner un tableau vide si l'utilisateur n'est pas membre
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]models.GroupEvent{})
		return
	}

	events, err := sqlite.GetGroupEvents(sqlite.DB, groupID, userID)
	if err != nil {
		http.Error(w, "Failed to fetch events", http.StatusInternalServerError)
		return
	}

	// S'assurer de retourner un tableau même vide
	// if events == nil {
	// 	events = []models.GroupEvent{}
	// }

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(events)
}

func RespondToEventHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, _ := GetUserIDFromSession(r)
	if userID == 0 {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req models.EventResponseRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if req.Response != "going" && req.Response != "not_going" {
		http.Error(w, "Invalid response type", http.StatusBadRequest)
		return
	}

	response := models.EventResponse{
		EventID:  req.EventID,
		UserID:   userID,
		Response: req.Response,
	}

	err = sqlite.CreateEventResponse(sqlite.DB, response)
	if err != nil {
		http.Error(w, "Failed to save response", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Response saved"))
}

func GetEventResponsesHandler(w http.ResponseWriter, r *http.Request) {
	userID, _ := GetUserIDFromSession(r)
	if userID == 0 {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	eventIDStr := strings.TrimPrefix(r.URL.Path, "/api/events/")
	eventIDStr = strings.TrimSuffix(eventIDStr, "/responses")
	eventID, err := strconv.Atoi(eventIDStr)
	if err != nil {
		http.Error(w, "Invalid event ID", http.StatusBadRequest)
		return
	}

	responses, err := sqlite.GetEventResponses(sqlite.DB, eventID)
	if err != nil {
		http.Error(w, "Failed to fetch responses", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(responses)
}