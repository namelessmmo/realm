package client

import (
	"net/http"
	"sync"
	"time"

	"github.com/namelessmmo/realm/pkg/server/location"
	"github.com/namelessmmo/realm/pkg/server/packets/outgoing"

	"github.com/pkg/errors"

	"github.com/gorilla/websocket"
)

const MaxClients = 100

const tickRate = (1000 / 60) * time.Millisecond // half of a frame at 60 frames

type Handler struct {
	HMACString string

	clientsLock sync.Mutex
	clients     []*Client
}

func NewClientHandler(hmacString string) *Handler {
	return &Handler{
		HMACString: hmacString,
		clients:    make([]*Client, MaxClients),
	}
}

func (handler *Handler) GetClientByUsername(username string) *Client {
	for _, client := range handler.clients {
		if client == nil {
			continue
		}
		if client.Username == username {
			return client
		}
	}
	return nil
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
		_ = conn.Close()
		return
	}

	// Create the client
	client := NewClient(conn, id, handler)

	closeHandler := conn.CloseHandler() // get the existing close handler
	conn.SetCloseHandler(func(code int, text string) error {
		client.Disconnect(499, "Client disconnected")
		return closeHandler(code, text) // call the existing close handler
	})

	// Set the client
	handler.clients[id] = client

	// Start the client
	go client.Run()

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
			if client.Disconnecting == true {
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

			if client.PacketHandler.ProcessOutgoingPackets() == false && client.Disconnected == true {
				handler.removeClient(client.ID)
			}
		}

		// Process outgoing packets as fast as we can
		// things will only write if there is stuff in the buffer
		// or a ping
	}
}

func (handler *Handler) state() {
	for {
		// send state updates to clients
		for _, myClient := range handler.clients {
			if myClient == nil {
				continue
			}
			if myClient.Disconnecting == true {
				continue
			}
			myCharacter := myClient.GetCharacter()
			if myCharacter == nil {
				continue
			}
			statePacket := &outgoing.LocalCharacterState{
				Characters: make([]outgoing.CharacterState, 0),
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
				if client.Disconnecting == true {
					continue
				}
				character := client.GetCharacter()
				if character == nil {
					continue
				}

				clientLoc := character.GetLocation()
				if clientLoc.GetWorld().Name != world.Name {
					continue
				}
				if clientLoc.GetX() < topLeft.GetX() || clientLoc.GetY() < topLeft.GetY() {
					continue
				}
				if clientLoc.GetX() > bottomRight.GetX() || clientLoc.GetY() > bottomRight.GetY() {
					continue
				}
				statePacket.Characters = append(statePacket.Characters, outgoing.CharacterState{ID: character.ID, PlayerID: client.ID, Location: outgoing.CharacterStateLocation{World: clientLoc.GetWorld().Name, X: clientLoc.GetX(), Y: clientLoc.GetY()}})
			}

			myClient.PacketHandler.WritePacket(statePacket)
		}

		// send a state update every frame
		// the local player has prediction so this won't be laggy locally
		// it may be laggy for the remote players
		time.Sleep(tickRate)
	}
}

func (handler *Handler) Run() {
	go handler.process()
	go handler.packets()
	go handler.state()
}
