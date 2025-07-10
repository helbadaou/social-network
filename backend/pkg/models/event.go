package models

import (
	"time"
)

type Event struct {
	ID          int       `json:"id" db:"id"`
	GroupID     int       `json:"group_id" db:"group_id"`
	CreatorID   int       `json:"creator_id" db:"creator_id"`
	Title       string    `json:"title" db:"title"`
	Description string    `json:"description" db:"description"`
	EventDate   time.Time `json:"event_date" db:"event_date"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
	
	// Relations
	Group     *Group          `json:"group,omitempty"`
	Creator   *User           `json:"creator,omitempty"`
	Responses []EventResponse `json:"responses,omitempty"`
	
	// Computed fields
	GoingCount    int `json:"going_count,omitempty"`
	NotGoingCount int `json:"not_going_count,omitempty"`
}

type EventResponse struct {
	ID        int       `json:"id" db:"id"`
	EventID   int       `json:"event_id" db:"event_id"`
	UserID    int       `json:"user_id" db:"user_id"`
	Response  string    `json:"response" db:"response"` // going, not_going
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
	
	// Relations
	Event *Event `json:"event,omitempty"`
	User  *User  `json:"user,omitempty"`
}

// Event response types
const (
	EventResponseGoing    = "going"
	EventResponseNotGoing = "not_going"
)

// Helper methods for Event
func (e *Event) IsUserGoing(userID int) bool {
	for _, response := range e.Responses {
		if response.UserID == userID {
			return response.Response == EventResponseGoing
		}
	}
	return false
}

func (e *Event) GetUserResponse(userID int) *EventResponse {
	for _, response := range e.Responses {
		if response.UserID == userID {
			return &response
		}
	}
	return nil
}

func (e *Event) CalculateResponseCounts() {
	e.GoingCount = 0
	e.NotGoingCount = 0
	
	for _, response := range e.Responses {
		switch response.Response {
		case EventResponseGoing:
			e.GoingCount++
		case EventResponseNotGoing:
			e.NotGoingCount++
		}
	}
}

// Event creation request
type CreateEventRequest struct {
	GroupID     int       `json:"group_id" validate:"required"`
	Title       string    `json:"title" validate:"required,min=1,max=200"`
	Description string    `json:"description" validate:"max=1000"`
	EventDate   time.Time `json:"event_date" validate:"required"`
}

// Event response request
type EventResponseRequest struct {
	EventID  int    `json:"event_id" validate:"required"`
	Response string `json:"response" validate:"required,oneof=going not_going"`
}