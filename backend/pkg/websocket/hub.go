package websocket

import (
	"encoding/json"
	"fmt"
	"time"

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

// Ajouter cette méthode au Hub
// Dans hub.go, modifiez la méthode SendFollowRequest :
func (h *Hub) SendFollowRequest(fromID, toID int, senderName string) {
	// Créer une notification proprement formatée
	notification := map[string]interface{}{
		"type":       "notification",
		"sender_id":  fromID,
		"message":    fmt.Sprintf("%s vous a envoyé une demande d'abonnement", senderName),
		"created_at": time.Now().Format(time.RFC3339),
	}

	// Envoyer seulement au destinataire
	if recipient, ok := h.Clients[toID]; ok {
		notifBytes, err := json.Marshal(notification)
		if err == nil {
			select {
			case recipient.Send <- notifBytes:
				fmt.Printf("✅ Notification sent to user %d\n", toID)
			default:
				fmt.Printf("⚠️ Failed to send notification to user %d (channel full)\n", toID)
			}
		}
	} else {
		fmt.Printf("⚠️ User %d not connected, notification stored in DB only\n", toID)
	}
}

func (h *Hub) SendNotification(fromID, toID int, content string) {
	msg := Message{
		From:      fromID,
		To:        toID,
		Content:   content,
		Type:      "notification",
		Timestamp: time.Now().Format(time.RFC3339),
	}
	h.Broadcast <- msg
}
