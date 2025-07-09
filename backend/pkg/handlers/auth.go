package handlers

import (
    "database/sql"
    "encoding/json"
    "net/http"
    "social-network/pkg/middleware"
    "social-network/pkg/models"
    "social-network/pkg/utils"
    "time"
    
    "golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
    db *sql.DB
}

func NewAuthHandler(db *sql.DB) *AuthHandler {
    return &AuthHandler{db: db}
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost {
        utils.SendErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }

    var reg models.UserRegistration
    if err := json.NewDecoder(r.Body).Decode(&reg); err != nil {
        utils.SendErrorResponse(w, "Invalid JSON", http.StatusBadRequest)
        return
    }

    // Validate input
    if err := utils.ValidateEmail(reg.Email); err != nil {
        utils.SendErrorResponse(w, err.Error(), http.StatusBadRequest)
        return
    }
    
    if err := utils.ValidatePassword(reg.Password); err != nil {
        utils.SendErrorResponse(w, err.Error(), http.StatusBadRequest)
        return
    }
    
    if err := utils.ValidateName(reg.FirstName, "First name"); err != nil {
        utils.SendErrorResponse(w, err.Error(), http.StatusBadRequest)
        return
    }
    
    if err := utils.ValidateName(reg.LastName, "Last name"); err != nil {
        utils.SendErrorResponse(w, err.Error(), http.StatusBadRequest)
        return
    }
    
    if err := utils.ValidateDateOfBirth(reg.DateOfBirth); err != nil {
        utils.SendErrorResponse(w, err.Error(), http.StatusBadRequest)
        return
    }

    // Check if user already exists
    var existingUser models.User
    if err := existingUser.GetByEmail(h.db, reg.Email); err == nil {
        utils.SendErrorResponse(w, "User with this email already exists", http.StatusConflict)
        return
    }

    // Hash password
    hashedPassword, err := bcrypt.GenerateFromPassword([]byte(reg.Password), bcrypt.DefaultCost)
    if err != nil {
        utils.SendErrorResponse(w, "Error processing password", http.StatusInternalServerError)
        return
    }

    // Parse date of birth
    dob, err := time.Parse("2006-01-02", reg.DateOfBirth)
    if err != nil {
        utils.SendErrorResponse(w, "Invalid date format", http.StatusBadRequest)
        return
    }

    // Create user
    user := &models.User{
        Email:       reg.Email,
        PasswordHash: string(hashedPassword),
        FirstName:   reg.FirstName,
        LastName:    reg.LastName,
        DateOfBirth: dob,
        IsPrivate:   false,
    }

    if reg.Avatar != "" {
        user.Avatar = &reg.Avatar
    }
    if reg.Nickname != "" {
        user.Nickname = &reg.Nickname
    }
    if reg.AboutMe != "" {
        user.AboutMe = &reg.AboutMe
    }

    if err := user.Create(h.db); err != nil {
        utils.SendErrorResponse(w, "Error creating user", http.StatusInternalServerError)
        return
    }

    // Create session
    session, err := utils.CreateSession(h.db, user.ID)
    if err != nil {
        utils.SendErrorResponse(w, "Error creating session", http.StatusInternalServerError)
        return
    }

    // Set session cookie
    utils.SetSessionCookie(w, session.ID)

    // Return user data (without password)
    user.PasswordHash = ""
    utils.SendSuccessResponse(w, user)
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost {
        utils.SendErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }

    var login models.UserLogin
    if err := json.NewDecoder(r.Body).Decode(&login); err != nil {
        utils.SendErrorResponse(w, "Invalid JSON", http.StatusBadRequest)
        return
    }

    // Validate input
    if err := utils.ValidateEmail(login.Email); err != nil {
        utils.SendErrorResponse(w, err.Error(), http.StatusBadRequest)
        return
    }

    if login.Password == "" {
        utils.SendErrorResponse(w, "Password is required", http.StatusBadRequest)
        return
    }

    // Get user from database
    var user models.User
    if err := user.GetByEmail(h.db, login.Email); err != nil {
        utils.SendErrorResponse(w, "Invalid credentials", http.StatusUnauthorized)
        return
    }

    // Check password
    if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(login.Password)); err != nil {
        utils.SendErrorResponse(w, "Invalid credentials", http.StatusUnauthorized)
        return
    }

    // Create session
    session, err := utils.CreateSession(h.db, user.ID)
    if err != nil {
        utils.SendErrorResponse(w, "Error creating session", http.StatusInternalServerError)
        return
    }

    // Set session cookie
    utils.SetSessionCookie(w, session.ID)

    // Return user data (without password)
    user.PasswordHash = ""
    utils.SendSuccessResponse(w, user)
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost {
        utils.SendErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }

    // Get session cookie
    cookie, err := r.Cookie("session_token")
    if err == nil {
        // Delete session from database
        session := &models.Session{ID: cookie.Value}
        session.Delete(h.db)
    }

    // Clear session cookie
    utils.ClearSessionCookie(w)

    utils.SendMessageResponse(w, "Logged out successfully")
}

func (h *AuthHandler) GetCurrentUser(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodGet {
        utils.SendErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }

    userID := middleware.GetUserIDFromContext(r)
    if userID == 0 {
        utils.SendErrorResponse(w, "User not found", http.StatusUnauthorized)
        return
    }

    var user models.User
    if err := user.GetByID(h.db, userID); err != nil {
        utils.SendErrorResponse(w, "User not found", http.StatusNotFound)
        return
    }

    // Don't return password hash
    user.PasswordHash = ""
    utils.SendSuccessResponse(w, user)
}