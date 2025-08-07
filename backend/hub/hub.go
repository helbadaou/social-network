package hub

import (
	"encoding/json"
	"fmt"
	"sync"

	"social/models"
)

type Hub struct {
	Clients    map[int]*Client
	Register   chan *Client
	Unregister chan *Client
	Broadcast  chan models.Message
	services   *Handler
	// Add group members cache
	groupMembersCache map[int][]int // groupID -> []userIDs
	cacheMutex        sync.RWMutex
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
					fmt.Println("❌ Group message received with GroupID 0")
					continue
				}

				// Check cache first
				h.cacheMutex.RLock()
				members, cached := h.groupMembersCache[groupID]
				h.cacheMutex.RUnlock()

				if !cached {
					// Cache miss - fetch from database
					if err := h.WarmGroupMembersCache(groupID); err != nil {
						fmt.Printf("❌ Failed to get group members: %v\n", err)
						continue
					}
					h.cacheMutex.RLock()
					members = h.groupMembersCache[groupID]
					h.cacheMutex.RUnlock()
				}

				// Send to all connected members
				for _, userID := range members {
					if client, ok := h.Clients[userID]; ok {
						select {
						case client.Send <- msgBytes:
							// Success
						default:
							close(client.Send)
							delete(h.Clients, client.ID)
						}
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

func (h *Hub) WarmGroupMembersCache(groupID int) error {
	members, err := h.services.GetGroupMembers(groupID)
	if err != nil {
		return err
	}

	h.cacheMutex.Lock()
	defer h.cacheMutex.Unlock()

	userIDs := make([]int, len(members))
	for i, member := range members {
		userIDs[i] = member.ID
	}

	h.groupMembersCache[groupID] = userIDs
	return nil
}
