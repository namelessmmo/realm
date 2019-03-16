package client

import (
	"net/http"
	"sync"
	"time"

	"github.com/namelessmmo/realm/pkg/server/location"

	"github.com/namelessmmo/realm/pkg/server/packets/outgoing"

	"github.com/sirupsen/logrus"

	"github.com/pkg/errors"

	"github.com/gorilla/websocket"
)

const MaxClients = 100

const tickRate = (1000 / 60) * time.Millisecond

type Handler struct {
	clientsLock sync.Mutex
	clients     []*Client
}

func NewClientHandler() *Handler {
	return &Handler{
		clients: make([]*Client, MaxClients),
	}
}

func (handler *Handler) addClient(conn *websocket.Conn) {
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

func (handler *Handler) removeClient(id int) {
	// Lock the clients
	handler.clientsLock.Lock()
	defer handler.clientsLock.Unlock()

	handler.clients[id] = nil
}

func (handler *Handler) HandleClient(w http.ResponseWriter, r *http.Request, upgrader websocket.Upgrader) error {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return errors.Wrap(err, "Error upgrading http connection")
	}

	handler.addClient(conn)

	return nil
}

func (handler *Handler) process() {
	for {
		// Process Clients
		for _, client := range handler.clients {
			if client == nil {
				continue
			}
			if client.Disconnected == true {
				continue
			}
			if client.Initialized == false {
				continue
			}

			client.Process()

		}

		time.Sleep(tickRate)
	}
}

func (handler *Handler) packets() {
	for {
		// Process outgoing packets for clients
		for _, client := range handler.clients {
			if client == nil {
				continue
			}
			if client.Disconnected == true {
				handler.removeClient(client.ID)
				continue
			}
			client.PacketHandler.ProcessOutgoingPackets()
		}

		time.Sleep(tickRate)
	}
}

func (handler *Handler) state() {
	for {
		// send state updates to clients
		for _, myClient := range handler.clients {
			if myClient == nil {
				continue
			}
			if myClient.Disconnected == true {
				continue
			}
			if myClient.Initialized == false {
				continue
			}
			statePacket := &outgoing.LocalPlayerState{
				Players: make([]outgoing.PlayerState, 0),
			}

			myCamera := myClient.Camera
			loc := myCamera.Location
			world := loc.GetWorld()
			topLeft := location.NewLocation(world, loc.GetX()-(world.GetTileWidth()*5), loc.GetY()-(world.GetWidth()*5))                                                // subtract 5 tiles for a buffer
			bottomRight := location.NewLocation(world, loc.GetX()+myCamera.screenWidth+(world.GetTileWidth()*5), loc.GetY()+myCamera.screenHeight+(world.GetWidth()*5)) //add 5 tiles for a buffer

			for _, client := range handler.clients {
				if client == nil {
					continue
				}
				if client.Disconnected == true {
					continue
				}
				if client.Initialized == false {
					continue
				}

				clientLoc := client.GetLocation()
				if clientLoc.GetWorld().Name != world.Name {
					continue
				}
				if clientLoc.GetX() < topLeft.GetX() || clientLoc.GetY() < topLeft.GetY() {
					continue
				}
				if clientLoc.GetX() > bottomRight.GetX() || clientLoc.GetY() > bottomRight.GetY() {
					continue
				}
				statePacket.Players = append(statePacket.Players, outgoing.PlayerState{ID: client.ID, Location: outgoing.PlayerStateLocation{World: clientLoc.GetWorld().Name, X: clientLoc.GetX(), Y: clientLoc.GetY()}})
			}

			myClient.PacketHandler.WritePacket(statePacket)
		}

		time.Sleep(tickRate)
	}
}

func (handler *Handler) Run() {
	go handler.process()
	go handler.packets()
	go handler.state()
}
