package hub

import (
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"

	"social/models"
	"social/services"

	"github.com/gorilla/websocket"
)

type Handler struct {
	service *services.AuthService
	session *services.SessionService
	group   *services.GroupService
	serv    *services.ChatService
	hub     *Hub
}

func NewHandler(service *services.AuthService, session *services.SessionService, group *services.GroupService, hubS *Hub) *Handler {
	return &Handler{service: service, session: session, group: group, hub: hubS}
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return isOriginAllowed(r.Header.Get("Origin"))
	},
}

func isOriginAllowed(origin string) bool {
	if origin == "" {
		return false
	}

	parsedOrigin, err := url.Parse(origin)
	if err != nil || parsedOrigin.Scheme == "" || parsedOrigin.Host == "" {
		return false
	}

	allowedOriginsRaw := os.Getenv("WS_ALLOWED_ORIGINS")
	if strings.TrimSpace(allowedOriginsRaw) == "" {
		allowedOriginsRaw = "http://localhost:3000,http://127.0.0.1:3000"
	}

	for _, allowed := range strings.Split(allowedOriginsRaw, ",") {
		if strings.EqualFold(strings.TrimSpace(allowed), origin) {
			return true
		}
	}

	return false
}

func (h *Handler) ServeWS(hub *Hub, w http.ResponseWriter, r *http.Request) {
	log.Printf("🌐 WebSocket request received from %s - Headers: %v\n", r.RemoteAddr, r.Header.Get("Origin"))

	// Require valid session cookie authentication before upgrading to WebSocket.
	userID, err := h.session.GetUserIDFromSession(r)
	if err != nil || userID == 0 {
		log.Printf("❌ WebSocket auth failed: %v\n", err)
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	log.Printf("✅ Authentication via session cookie - userID: %d\n", userID)

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("❌ Upgrade error: %v\n", err)
		http.Error(w, "Failed to upgrade connection", http.StatusBadRequest)
		return
	}

	log.Println("✅ WebSocket connection upgraded successfully")

	client := &Client{
		ID:   userID,
		Conn: conn,
		Send: make(chan []byte, 256),
	}

	hub.Register <- client

	go h.notifyGroupMembersOfOnlineStatus(userID, hub)

	go client.writePump()
	go client.readPump(hub)
}

func (h *Handler) notifyGroupMembersOfOnlineStatus(userID int, hub *Hub) {
	groups, err := h.group.GetGroupsForUser(userID)
	if err != nil {
		log.Printf("Error getting groups for user %d: %v", userID, err)
		return
	}

	for _, group := range groups {
		members, err := h.group.GetGroupMembers(group.ID)
		if err != nil {
			log.Printf("Error getting members for group %d: %v", group.ID, err)
			continue
		}

		onlineStatusMsg := models.Message{
			Type:    "user_online",
			From:    userID,
			GroupID: group.ID,
		}

		for _, member := range members {
			if member.ID != userID {
				hub.SendMessageToUser(member.ID, onlineStatusMsg)
			}
		}
	}
}

func (h *Handler) GetGroupMembers(id int) ([]models.GroupMember, error) {
	return h.group.GetGroupMembers(id)
}
