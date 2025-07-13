package websocket

import (
	"net/http"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // allow all origins for now
	},
}

func ServeWS(hub *Hub, w http.ResponseWriter, r *http.Request, userID string) {
	
	ws, err := upgrader.Upgrade(w, r, nil)
	
	if err != nil {
		return
	}

	conn := &Connection{Ws: ws}
	
	client := &Client{
		ID:   userID,
		Conn: conn,
		Send: make(chan Message),
	}

	hub.Connected <- client

	go conn.ReadPump(hub, client)
	go conn.WritePump(client)
}
