package websocket

import (
	"log"
)

type Message struct {
	From    string `json:"from"`
	To      string `json:"to"`
	Content string `json:"content"`
	Type    string `json:"type"` // e.g., "private" or "group"
}

type Client struct {
	ID   string
	Conn *Connection
	Send chan Message
}

type Hub struct {
	Clients    map[string]*Client
	Connected   chan *Client
	Disconnected chan *Client
	Broadcast  chan Message
}

func NewHub() *Hub {
	return &Hub{
		Clients:    make(map[string]*Client),
		Connected:   make(chan *Client),
		Disconnected: make(chan *Client),
		Broadcast:  make(chan Message),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Connected:
			h.Clients[client.ID] = client
			log.Println("✅ Connected user:", client.ID)

		case client := <-h.Disconnected:
			if _, ok := h.Clients[client.ID]; ok {
				delete(h.Clients, client.ID)
				close(client.Send)
				log.Println("❌ NOt Connected user:", client.ID)
			}

		case msg := <-h.Broadcast:
			if receiver, ok := h.Clients[msg.To]; ok {
				receiver.Send <- msg
			}
		}
	}
}
