package websocket

import (
	 
	"github.com/gorilla/websocket"
	"log"
)

type Connection struct {
	Ws *websocket.Conn
}

func (c *Connection) ReadPump(hub *Hub, client *Client) {
	defer func() {
		hub.Disconnected <- client
		c.Ws.Close()
	}()

	for {
		var msg Message
		err := c.Ws.ReadJSON(&msg)
		if err != nil {
			break
		}
		msg.From = client.ID
		hub.Broadcast <- msg
	}
}

func (c *Connection) WritePump(client *Client) {
	
	defer func() {
		c.Ws.Close()
	}()

	/// As long as client.Send channel is open, keep reading messages from it.


	for msg := range client.Send {

		if err := c.Ws.WriteJSON(msg); err != nil {
		
			log.Println("Write error:", err)
			break
			
		}
	}
}
