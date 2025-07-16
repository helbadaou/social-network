package websocket

import (
	"encoding/json"
	"fmt"

	"github.com/gorilla/websocket"
)

 

func (c *Client) readPump(hub *Hub) {
	defer func() {
		hub.Unregister <- c
		c.Conn.Close()
	}()

	for {
		_, msgBytes, err := c.Conn.ReadMessage()
		if err != nil {
			// handle disconnect...
			break
		}

		var msg Message
		if err := json.Unmarshal(msgBytes, &msg); err != nil {
    fmt.Println("Invalid message:", err)
    continue
}

// 🚨 Override sender on server side to avoid duplicate / fake messages
msg.From = c.ID

		// Broadcast the message to the recipient
		hub.Broadcast <- msg
	}
}

func (c *Client) writePump() {
	for msg := range c.Send {
		err := c.Conn.WriteMessage(websocket.TextMessage, msg)
		if err != nil {
			break
		}
	}
}
