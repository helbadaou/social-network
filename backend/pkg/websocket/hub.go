package websocket

import (
	"encoding/json"
	"fmt"

	"github.com/gorilla/websocket"
)

type Message struct {
	From      int    `json:"from"`
	To        int    `json:"to"`
	Content   string `json:"content"`
	Type      string `json:"type"` // e.g., "private" or "group"
	Timestamp string `json:"timestamp"`
}

type Client struct {
	ID   int
	Conn *websocket.Conn
	Send chan []byte
}

type Hub struct {
	Clients    map[int]*Client
	Register   chan *Client
	Unregister chan *Client
	Broadcast  chan Message
}

type Notification struct {
	ID             int    `json:"id"`
	SenderID       int    `json:"sender_id"`
	SenderNickname string `json:"sender_nickname"`
	Type           string `json:"type"`
	Message        string `json:"message"`
	Seen           bool   `json:"seen"`
	CreatedAt      string `json:"created_at"`
}

func NewHub() *Hub {
	return &Hub{
		Clients:    make(map[int]*Client),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
		Broadcast:  make(chan Message),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.Clients[client.ID] = client
			fmt.Println("✅ Registered user", client.ID)

		case client := <-h.Unregister:
			delete(h.Clients, client.ID)
			close(client.Send)

		case msg := <-h.Broadcast:
			msgBytes, err := json.Marshal(msg)
			if err != nil {
				fmt.Println("❌ Failed to marshal message:", err)
				continue
			}

			// Send to recipient if connected
			if recipient, ok := h.Clients[msg.To]; ok {
				recipient.Send <- msgBytes
			} else {
				fmt.Printf("⚠️ Recipient %d not connected. Message from %d not delivered.\n", msg.To, msg.From)
				// Optionally: buffer message for later delivery
			}

			// Optionally send to sender for confirmation
			if sender, ok := h.Clients[msg.From]; ok {
				sender.Send <- msgBytes
			}
		}
	}
}

// After inserting notification in DB, fetch it and send:
func (h *Hub) SendNotification(notification Notification, toID int) {
	msgBytes, _ := json.Marshal(notification)
	if recipient, ok := h.Clients[toID]; ok {
		recipient.Send <- msgBytes
	}
}


func (h *Hub) SendMessageToUser(userID int, message Message) {
	msgBytes, err := json.Marshal(message)
	if err != nil {
		fmt.Printf("❌ Failed to marshal message: %v\n", err)
		return
	}

	if client, ok := h.Clients[userID]; ok {
		select {
		case client.Send <- msgBytes:
			fmt.Printf("✅ Message sent to user %d\n", userID)
		default:
			// Canal plein, client déconnecté ou occupé
			fmt.Printf("⚠️ Failed to send message to user %d (channel full or client disconnected)\n", userID)
		}
	} else {
		fmt.Printf("⚠️ User %d not connected\n", userID)
	}
}