package models

type User struct {
	ID          int
	Email       string
	Password    string
	FirstName   string
	LastName    string
	DateOfBirth string
	Nickname    string
	About       string
	Avatar      string
	IsPrivate   bool
}

type Recipient struct {
	ID     int    `json:"id"`
	Name   string `json:"name"`
	Avatar string `json:"avatar"`
}
