package client

import (
	"net/http"
	"sync"
	"time"

	"github.com/namelessmmo/realm/pkg/server/packets/outgoing"

	"github.com/sirupsen/logrus"

	"github.com/pkg/errors"

	"github.com/gorilla/websocket"
)

const MaxClients = 100

type ClientHandler struct {
	clientsLock sync.Mutex
	clients     []*Client
}

func NewClientHandler() *ClientHandler {
	return &ClientHandler{
		clients: make([]*Client, MaxClients),
	}
}

func (handler *ClientHandler) addClient(conn *websocket.Conn) {
	// Lock the clients
	handler.clientsLock.Lock()
	defer handler.clientsLock.Unlock()

	// Get the new client ID
	id := -1

	for i, c := range handler.clients {
		if c == nil {
			id = i
			break
		}
	}

	if id == -1 {
		// Close the connection because we are full
		_ = conn.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseTryAgainLater, ""))
		return
	}

	// Create the client
	client := NewClient(conn, id)

	// Set close handlers
	conn.SetCloseHandler(nil)           // set a nil close handler
	closeHandler := conn.CloseHandler() // get the nil close handler
	conn.SetCloseHandler(func(code int, text string) error {
		logrus.Infof("Connection Closed")
		handler.removeClient(client.ID)
		return closeHandler(code, text) // call the nil close handler
	})

	// Start the client
	go client.Run()

	// Set the client
	handler.clients[id] = client
}

func (handler *ClientHandler) removeClient(id int) {
	// Lock the clients
	handler.clientsLock.Lock()
	defer handler.clientsLock.Unlock()

	handler.clients[id] = nil
}

func (handler *ClientHandler) HandleClient(w http.ResponseWriter, r *http.Request, upgrader websocket.Upgrader) error {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return errors.Wrap(err, "Error upgrading http connection")
	}

	handler.addClient(conn)

	return nil
}

func (handler *ClientHandler) process() {
	for {
		// TODO: only update state for players nearby (on the screen)
		// this is hard because on the edges of the screen the player isn't in the middle
		statePacket := &outgoing.LocalPlayerState{
			Players: make([]outgoing.PlayerState, 0, len(handler.clients)),
		}
		// Process Clients
		for _, client := range handler.clients {
			if client == nil {
				continue
			}
			if client.Disconnected == true {
				handler.removeClient(client.ID)
				continue
			}
			if client.Initialized == false {
				continue
			}

			client.PacketHandler.ProcessOutgoingPackets()
			client.Process()

			location := client.GetLocation()
			statePacket.Players = append(statePacket.Players, outgoing.PlayerState{ID: client.ID, X: location.GetX(), Y: location.GetY()})

		}

		for _, client := range handler.clients {
			if client == nil || client.Initialized == false {
				continue
			}
			client.PacketHandler.WritePacket(statePacket)
		}

		// TODO: figure out this
		// currently update once every frame for 60 FPS
		time.Sleep((1000 / 60) * time.Millisecond)
	}
}

func (handler *ClientHandler) Run() {
	go handler.process()
}
