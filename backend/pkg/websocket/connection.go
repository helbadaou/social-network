package websocket

import (
	"encoding/json"
	"log"
	"time"

	"social-network/backend/pkg/db/sqlite"

	"github.com/gorilla/websocket"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 512
)

func (c *Client) readPump(hub *Hub) {
	defer func() {
		hub.Unregister <- c
		c.Conn.Close()
	}()

	c.Conn.SetReadLimit(maxMessageSize)
	c.Conn.SetReadDeadline(time.Now().Add(pongWait))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, msgBytes, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("Read error: %v", err)
			}
			break
		}

		var msg Message
		if err := json.Unmarshal(msgBytes, &msg); err != nil {
			log.Printf("Invalid message: %v", err)
			continue
		}

		// Validate required fields
		if msg.From == 0 || msg.To == 0 || msg.Content == "" {
			log.Printf("Missing required message fields")
			continue
		}

		// Force correct sender ID and add timestamp
		msg.From = c.ID
		if msg.Timestamp == "" {
			msg.Timestamp = time.Now().Format(time.RFC3339)
		}

		// Vérification : empêcher l'envoi de message à un profil privé si l'expéditeur n'est pas abonné
		var isPrivate bool
		err = sqlite.DB.QueryRow(`SELECT is_private FROM users WHERE id = ?`, msg.To).Scan(&isPrivate)
		if err == nil && isPrivate && msg.From != msg.To {
			var status string
			err = sqlite.DB.QueryRow(`SELECT status FROM followers WHERE follower_id = ? AND followed_id = ?`, msg.From, msg.To).Scan(&status)
			if err != nil || status != "accepted" {
				log.Printf("Tentative d'envoi de message refusée : profil privé non suivi")
				continue // ignore le message
			}
		}

		// Store message in database
		_, err = sqlite.DB.Exec(`
            INSERT INTO messages (from_id, to_id, content, type, timestamp)
            VALUES (?, ?, ?, ?, ?)
        `, msg.From, msg.To, msg.Content, msg.Type, time.Now())
		if err != nil {
			log.Printf("Error storing message: %v", err)
		}

		hub.Broadcast <- msg
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
