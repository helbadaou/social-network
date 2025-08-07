package hub

import (
	"encoding/json"
	"fmt"
	"social/models"
)

type Hub struct {
	Clients    map[int]*Client
	Register   chan *Client
	Unregister chan *Client
	Broadcast  chan models.Message
}

func NewHub() *Hub {
	return &Hub{
		Clients:    make(map[int]*Client),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
		Broadcast:  make(chan models.Message),
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

			switch msg.Type {
			case "private":
				if recipient, ok := h.Clients[msg.To]; ok {
					select {
					case recipient.Send <- msgBytes:
						fmt.Printf("✅ Private message sent to user %d\n", msg.To)
					default:
						close(recipient.Send)
						delete(h.Clients, recipient.ID)
						fmt.Printf("⚠️ Failed to send private message to user %d (channel full or disconnected)\n", msg.To)
					}
				} else {
					fmt.Printf("⚠️ Private message recipient user %d not connected\n", msg.To)
				}

			case "group":
				groupID := msg.GroupID
				if groupID == 0 {
					fmt.Println("❌ Group message received with GroupID 0. Skipping broadcast.")
					continue
				}

				members, err := h.handlers.g

				if err != nil {
					fmt.Printf("❌ Failed to get group members for group %d: %v\n", groupID, err)
					continue
				}

				for _, memberID := range members {
					if client, ok := h.Clients[memberID]; ok {
						select {
						case client.Send <- msgBytes:
							fmt.Printf("✅ Group message sent to member %d in group %d\n", memberID, groupID)
						default:
							fmt.Printf("⚠️ Failed to send group message to member %d (channel full or disconnected)\n", memberID)
							close(client.Send)
							delete(h.Clients, client.ID)
						}
					} else {
						fmt.Printf("⚠️ Group member %d not connected, skipping message.\n", memberID)
					}
				}
			default:
				fmt.Printf("❌ Unknown message type: %s\n", msg.Type)
			}
		}
	}
}

// After inserting notification in DB, fetch it and send:
func (h *Hub) SendNotification(notification models.Notification, toID int) {
	msgBytes, _ := json.Marshal(notification)
	if recipient, ok := h.Clients[toID]; ok {
		recipient.Send <- msgBytes
	}
}

func (h *Hub) SendMessageToUser(userID int, message models.Message) {
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
