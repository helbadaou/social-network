package models

import (
    "database/sql"
    "time"
)

type User struct {
    ID          int       `json:"id"`
    Email       string    `json:"email"`
    PasswordHash string   `json:"-"`
    FirstName   string    `json:"firstName"`
    LastName    string    `json:"lastName"`
    DateOfBirth time.Time `json:"dateOfBirth"`
    Avatar      *string   `json:"avatar"`
    Nickname    *string   `json:"nickname"`
    AboutMe     *string   `json:"aboutMe"`
    IsPrivate   bool      `json:"isPrivate"`
    CreatedAt   time.Time `json:"createdAt"`
    UpdatedAt   time.Time `json:"updatedAt"`
}

type UserRegistration struct {
    Email       string `json:"email"`
    Password    string `json:"password"`
    FirstName   string `json:"firstName"`
    LastName    string `json:"lastName"`
    DateOfBirth string `json:"dateOfBirth"`
    Avatar      string `json:"avatar,omitempty"`
    Nickname    string `json:"nickname,omitempty"`
    AboutMe     string `json:"aboutMe,omitempty"`
}

type UserLogin struct {
    Email    string `json:"email"`
    Password string `json:"password"`
}

type UserProfile struct {
    User
    FollowersCount  int  `json:"followersCount"`
    FollowingCount  int  `json:"followingCount"`
    PostsCount      int  `json:"postsCount"`
    IsFollowing     bool `json:"isFollowing"`
    FollowStatus    string `json:"followStatus"` // pending, accepted, none
}

type Follow struct {
    ID          int       `json:"id"`
    FollowerID  int       `json:"followerId"`
    FollowingID int       `json:"followingId"`
    Status      string    `json:"status"`
    CreatedAt   time.Time `json:"createdAt"`
    UpdatedAt   time.Time `json:"updatedAt"`
}

type FollowRequest struct {
    Follow
    FollowerUser User `json:"followerUser"`
}

func (u *User) GetByID(db *sql.DB, id int) error {
    query := `
        SELECT id, email, password_hash, first_name, last_name, date_of_birth, 
               avatar, nickname, about_me, is_private, created_at, updated_at
        FROM users WHERE id = ?
    `
    row := db.QueryRow(query, id)
    
    return row.Scan(
        &u.ID, &u.Email, &u.PasswordHash, &u.FirstName, &u.LastName,
        &u.DateOfBirth, &u.Avatar, &u.Nickname, &u.AboutMe, &u.IsPrivate,
        &u.CreatedAt, &u.UpdatedAt,
    )
}

func (u *User) GetByEmail(db *sql.DB, email string) error {
    query := `
        SELECT id, email, password_hash, first_name, last_name, date_of_birth, 
               avatar, nickname, about_me, is_private, created_at, updated_at
        FROM users WHERE email = ?
    `
    row := db.QueryRow(query, email)
    
    return row.Scan(
        &u.ID, &u.Email, &u.PasswordHash, &u.FirstName, &u.LastName,
        &u.DateOfBirth, &u.Avatar, &u.Nickname, &u.AboutMe, &u.IsPrivate,
        &u.CreatedAt, &u.UpdatedAt,
    )
}

func (u *User) Create(db *sql.DB) error {
    query := `
        INSERT INTO users (email, password_hash, first_name, last_name, date_of_birth, avatar, nickname, about_me, is_private)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    result, err := db.Exec(query, u.Email, u.PasswordHash, u.FirstName, u.LastName, u.DateOfBirth, u.Avatar, u.Nickname, u.AboutMe, u.IsPrivate)
    if err != nil {
        return err
    }
    
    id, err := result.LastInsertId()
    if err != nil {
        return err
    }
    
    u.ID = int(id)
    return nil
}

func (f *Follow) CreateFollow(db *sql.DB) error {
	_, err := db.Exec(`
		INSERT INTO follows (user_id, followed_id, created_at)
		VALUES (?, ?, ?)
	`, f.FollowerID, f.FollowingID, time.Now())
	return err
}


func (u *User) Update(db *sql.DB) error {
    query := `
        UPDATE users 
        SET first_name = ?, last_name = ?, avatar = ?, nickname = ?, about_me = ?, is_private = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `
    _, err := db.Exec(query, u.FirstName, u.LastName, u.Avatar, u.Nickname, u.AboutMe, u.IsPrivate, u.ID)
    return err
}

func GetUsers(db *sql.DB, currentUserID int, limit, offset int) ([]User, error) {
    query := `
        SELECT id, email, first_name, last_name, date_of_birth, avatar, nickname, about_me, is_private, created_at, updated_at
        FROM users 
        WHERE id != ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
    `
    rows, err := db.Query(query, currentUserID, limit, offset)
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    
    var users []User
    for rows.Next() {
        var u User
        err := rows.Scan(&u.ID, &u.Email, &u.FirstName, &u.LastName, &u.DateOfBirth, &u.Avatar, &u.Nickname, &u.AboutMe, &u.IsPrivate, &u.CreatedAt, &u.UpdatedAt)
        if err != nil {
            return nil, err
        }
        users = append(users, u)
    }
    
    return users, nil
}