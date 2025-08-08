package hub

import (
	"log"
	"net/http"

	"social/models"
	"social/services"

	"github.com/gorilla/websocket"
)

type Handler struct {
	service *services.AuthService
	session *services.SessionService
	group   *services.GroupService
	hub     *Hub
}

func NewHandler(service *services.AuthService, session *services.SessionService, group *services.GroupService, hubS *Hub) *Handler {
	return &Handler{service: service, session: session, group: group, hub: hubS}
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // allow all origins for now
	},
}

func (h *Handler) ServeWS(hub *Hub, w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Upgrade error:", err)
		return
	}

	userID, _ := h.session.GetUserIDFromSession(w, r) // 🔐 Your own logic
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

func (h *Handler) GetGroupMembers(id int) ([]models.GroupMember, error) {
	return h.group.GetGroupMembers(id)
}
