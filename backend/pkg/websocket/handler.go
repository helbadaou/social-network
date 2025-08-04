package websocket

import (
	"log"
	"net/http"

	"github.com/gorilla/websocket"

	x "social-network/backend/pkg/auth"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // allow all origins for now
	},
}

func ServeWS(hub *Hub, w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Upgrade error:", err)
		return
	}

	userID, _ := x.GetUserIDFromSession(w, r) // 🔐 Your own logic
	if userID == 0 {
		conn.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseUnsupportedData, "Authentication required"))
		conn.Close()
		return
	}

	client := &Client{
		ID:   userID,
		Conn: conn,
		Send: make(chan []byte),
	}

	hub.Register <- client

	go client.writePump()
	go client.readPump(hub)
}
