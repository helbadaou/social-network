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