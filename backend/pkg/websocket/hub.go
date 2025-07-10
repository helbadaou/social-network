package websocket

import (
	"encoding/json"
	"log"
	"sync"
)

// Hub maintains the set of active clients and broadcasts messages to the clients
type Hub struct {
	// Registered clients
	clients map[*Client]bool

	// Inbound messages from the clients
	broadcast chan []byte

	// Register requests from the clients
	register chan *Client

	// Unregister requests from clients
	unregister chan *Client

	// Client lookup by user ID
	userClients map[int]*Client

	// Group clients lookup
	groupClients map[int]map[*Client]bool

	// Mutex for thread safety
	mutex sync.RWMutex
}

// NewHub creates a new Hub instance
func NewHub() *Hub {
	return &Hub{
		clients:      make(map[*Client]bool),
		broadcast:    make(chan []byte),
		register:     make(chan *Client),
		unregister:   make(chan *Client),
		userClients:  make(map[int]*Client),
		groupClients: make(map[int]map[*Client]bool),
	}
}

// Run starts the hub's main loop
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.registerClient(client)

		case client := <-h.unregister:
			h.unregisterClient(client)

		case message := <-h.broadcast:
			h.broadcastMessage(message)
		}
	}
}

// registerClient adds a client to the hub
func (h *Hub) registerClient(client *Client) {
	h.mutex.Lock()
	defer h.mutex.Unlock()

	h.clients[client] = true
	h.userClients[client.UserID] = client

	// Join user to their groups
	for _, groupID := range client.GroupIDs {
		if h.groupClients[groupID] == nil {
			h.groupClients[groupID] = make(map[*Client]bool)
		}
		h.groupClients[groupID][client] = true
	}

	log.Printf("Client registered: User ID %d", client.UserID)
}

// unregisterClient removes a client from the hub
func (h *Hub) unregisterClient(client *Client) {
	h.mutex.Lock()
	defer h.mutex.Unlock()

	if _, ok := h.clients[client]; ok {
		delete(h.clients, client)
		delete(h.userClients, client.UserID)

		// Remove from groups
		for groupID, clients := range h.groupClients {
			if _, exists := clients[client]; exists {
				delete(clients, client)
				if len(clients) == 0 {
					delete(h.groupClients, groupID)
				}
			}
		}

		close(client.send)
		log.Printf("Client unregistered: User ID %d", client.UserID)
	}
}

// broadcastMessage sends a message to all clients
func (h *Hub) broadcastMessage(message []byte) {
	h.mutex.RLock()
	defer h.mutex.RUnlock()

	for client := range h.clients {
		select {
		case client.send <- message:
		default:
			close(client.send)
			delete(h.clients, client)
		}
	}
}

// SendToUser sends a message to a specific user
func (h *Hub) SendToUser(userID int, message *WSMessage) {
	h.mutex.RLock()
	client, exists := h.userClients[userID]
	h.mutex.RUnlock()

	if exists {
		data, err := json.Marshal(message)
		if err != nil {
			log.Printf("Error marshaling message: %v", err)
			return
		}

		select {
		case client.send <- data:
		default:
			h.unregisterClient(client)
		}
	}
}

// SendToGroup sends a message to all members of a group
func (h *Hub) SendToGroup(groupID int, message *WSMessage) {
	h.mutex.RLock()
	clients, exists := h.groupClients[groupID]
	h.mutex.RUnlock()

	if !exists {
		return
	}

	data, err := json.Marshal(message)
	if err != nil {
		log.Printf("Error marshaling message: %v", err)
		return
	}

	h.mutex.RLock()
	defer h.mutex.RUnlock()

	for client := range clients {
		select {
		case client.send <- data:
		default:
			h.unregisterClient(client)
		}
	}
}

// IsUserOnline checks if a user is currently online
func (h *Hub) IsUserOnline(userID int) bool {
	h.mutex.RLock()
	defer h.mutex.RUnlock()

	_, exists := h.userClients[userID]
	return exists
}

// GetOnlineUsers returns a list of online user IDs
func (h *Hub) GetOnlineUsers() []int {
	h.mutex.RLock()
	defer h.mutex.RUnlock()

	users := make([]int, 0, len(h.userClients))
	for userID := range h.userClients {
		users = append(users, userID)
	}
	return users
}

// GetGroupOnlineUsers returns online users in a specific group
func (h *Hub) GetGroupOnlineUsers(groupID int) []int {
	h.mutex.RLock()
	defer h.mutex.RUnlock()

	clients, exists := h.groupClients[groupID]
	if !exists {
		return []int{}
	}

	users := make([]int, 0, len(clients))
	for client := range clients {
		users = append(users, client.UserID)
	}
	return users
}

// AddUserToGroup adds a user to a group's client list
func (h *Hub) AddUserToGroup(userID, groupID int) {
	h.mutex.Lock()
	defer h.mutex.Unlock()

	client, exists := h.userClients[userID]
	if !exists {
		return
	}

	if h.groupClients[groupID] == nil {
		h.groupClients[groupID] = make(map[*Client]bool)
	}
	h.groupClients[groupID][client] = true
	client.GroupIDs = append(client.GroupIDs, groupID)
}

// RemoveUserFromGroup removes a user from a group's client list
func (h *Hub) RemoveUserFromGroup(userID, groupID int) {
	h.mutex.Lock()
	defer h.mutex.Unlock()

	client, exists := h.userClients[userID]
	if !exists {
		return
	}

	if clients, exists := h.groupClients[groupID]; exists {
		delete(clients, client)
		if len(clients) == 0 {
			delete(h.groupClients, groupID)
		}
	}

	// Remove group from client's group list
	for i, id := range client.GroupIDs {
		if id == groupID {
			client.GroupIDs = append(client.GroupIDs[:i], client.GroupIDs[i+1:]...)
			break
		}
	}
}
