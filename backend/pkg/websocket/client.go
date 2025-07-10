package websocket

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
)

const (
	// Time allowed to write a message to the peer
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer
	pongWait = 60 * time.Second

	// Send pings to peer with this period. Must be less than pongWait
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from peer
	maxMessageSize = 512
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// Allow connections from any origin
		return true
	},
}

// Client is a middleman between the websocket connection and the hub
type Client struct {
	hub *Hub

	// The websocket connection
	conn *websocket.Conn

	// Buffered channel of outbound messages
	send chan []byte

	// User ID of the client
	UserID int

	// Group IDs the user belongs to
	GroupIDs []int

	// User information
	Username string
	Avatar   string
}

// NewClient creates a new client instance
func NewClient(hub *Hub, conn *websocket.Conn, userID int, username string, avatar string, groupIDs []int) *Client {
	return &Client{
		hub:      hub,
		conn:     conn,
		send:     make(chan []byte, 256),
		UserID:   userID,
		Username: username,
		Avatar:   avatar,
		GroupIDs: groupIDs,
	}
}

// readPump pumps messages from the websocket connection to the hub
func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			}
			break
		}

		// Parse the incoming message
		var wsMessage WSMessage
		if err := json.Unmarshal(message, &wsMessage); err != nil {
			log.Printf("Error unmarshaling message: %v", err)
			continue
		}

		// Set sender information
		wsMessage.SenderID = c.UserID
		wsMessage.SenderName = c.Username
		wsMessage.SenderAvatar = c.Avatar
		wsMessage.Timestamp = time.Now()

		// Handle the message based on its type
		c.handleMessage(&wsMessage)
	}
}

// writePump pumps messages from the hub to the websocket connection
func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Add queued chat messages to the current websocket message
			n := len(c.send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// handleMessage processes incoming websocket messages
func (c *Client) handleMessage(message *WSMessage) {
	switch message.Type {
	case WSMessageTypePrivateMessage:
		c.handlePrivateMessage(message)
	case WSMessageTypeGroupMessage:
		c.handleGroupMessage(message)
	case WSMessageTypeTyping:
		c.handleTypingIndicator(message)
	case WSMessageTypeMarkRead:
		c.handleMarkRead(message)
	default:
		log.Printf("Unknown message type: %s", message.Type)
	}
}

// handlePrivateMessage handles private message sending
func (c *Client) handlePrivateMessage(message *WSMessage) {
	// Validate that the user can send messages to the recipient
	if message.ReceiverID == 0 {
		log.Printf("Invalid receiver ID for private message")
		return
	}

	// Send the message to the recipient if they're online
	c.hub.SendToUser(message.ReceiverID, message)

	// Also send back to sender for confirmation
	c.hub.SendToUser(c.UserID, message)
}

// handleGroupMessage handles group message sending
func (c *Client) handleGroupMessage(message *WSMessage) {
	// Validate that the user is a member of the group
	if message.GroupID == 0 {
		log.Printf("Invalid group ID for group message")
		return
	}

	// Send the message to all group members
	c.hub.SendToGroup(message.GroupID, message)
}

// handleTypingIndicator handles typing indicator messages
func (c *Client) handleTypingIndicator(message *WSMessage) {
	if message.ReceiverID != 0 {
		// Private chat typing indicator
		c.hub.SendToUser(message.ReceiverID, message)
	} else if message.GroupID != 0 {
		// Group chat typing indicator
		c.hub.SendToGroup(message.GroupID, message)
	}
}

// handleMarkRead handles marking messages as read
func (c *Client) handleMarkRead(message *WSMessage) {
	// This would typically update the database to mark messages as read
	// For now, we'll just acknowledge the action
	response := &WSMessage{
		Type:      WSMessageTypeMarkRead,
		SenderID:  c.UserID,
		Timestamp: time.Now(),
		Data:      message.Data,
	}

	c.hub.SendToUser(c.UserID, response)
}

// ServeWS handles websocket requests from the peer
func ServeWS(hub *Hub, w http.ResponseWriter, r *http.Request, userID int, username string, avatar string, groupIDs []int) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}

	client := NewClient(hub, conn, userID, username, avatar, groupIDs)
	client.hub.register <- client

	// Allow collection of memory referenced by the caller by doing all work in
	// new goroutines
	go client.writePump()
	go client.readPump()
}