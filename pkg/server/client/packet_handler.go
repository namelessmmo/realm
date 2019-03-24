package client

import (
	"encoding/json"
	"reflect"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/mitchellh/mapstructure"
	"github.com/namelessmmo/realm/pkg/server/packets/outgoing"
	"github.com/pkg/errors"
)

const (
	// Time allowed to read the next pong message from the peer
	// this probably should be as small as possible
	pongWait = 5 * time.Second

	// Ping period, must be less than pongWait
	pingPeriod = (pongWait * 9) / 10
)

type RawIncomingPacket struct {
	Code string                 `json:"code"`
	Data map[string]interface{} `json:"data"`
}

type PacketHandler struct {
	connection *websocket.Conn
	sendBuffer chan outgoing.OutgoingPacket
	closeData  []byte

	readLock sync.Mutex
	lastPing time.Time

	closed bool
}

func NewPacketHandler(connection *websocket.Conn) *PacketHandler {
	return &PacketHandler{
		connection: connection,
		sendBuffer: make(chan outgoing.OutgoingPacket, 64),
		closed:     false,
	}
}

func (handler *PacketHandler) Setup() {
	handler.connection.SetReadLimit(1024) // TODO: figure out the correct size
	handler.connection.SetPongHandler(func(appData string) error {
		_ = handler.connection.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})
}

func (handler *PacketHandler) WritePacket(packet outgoing.OutgoingPacket) {
	handler.sendBuffer <- packet
}

func (handler *PacketHandler) close(closeCode int, text string) {
	handler.closeData = websocket.FormatCloseMessage(closeCode, text)
	close(handler.sendBuffer)
}

func (handler *PacketHandler) ProcessOutgoingPackets() bool {
	if handler.closed {
		return false
	}

	select {
	case packet, ok := <-handler.sendBuffer:
		_ = handler.connection.SetWriteDeadline(time.Now().Add(5 * time.Second))
		if !ok {
			// send channel was closed, client needs to be disconnected
			_ = handler.connection.WriteMessage(websocket.CloseMessage, handler.closeData)
			_ = handler.connection.Close()
			handler.closed = true
			return false
		}

		// write the current packet
		packetName := reflect.TypeOf(packet).Elem().Name()
		_ = handler.connection.WriteJSON(map[string]interface{}{"code": packetName, "data": packet})
		if packetName == "PlayerDisconnect" {
			handler.close(websocket.CloseNormalClosure, "Player Disconnecting")
			break
		}
	default:
		if time.Now().Before(handler.lastPing.Add(pingPeriod)) {
			break
		}

		handler.lastPing = time.Now()
		handler.WritePacket(&outgoing.Ping{})
	}

	return true
}

func (handler *PacketHandler) ReadRawPacket(timeout time.Duration) (*RawIncomingPacket, error) {
	defer func() {
		handler.readLock.Unlock()
		if timeout.Seconds() > 0 {
			_ = handler.connection.SetReadDeadline(time.Time{})
		}
	}()
	handler.readLock.Lock()
	if timeout.Seconds() > 0 {
		// setting this will break the connection when it times out
		_ = handler.connection.SetReadDeadline(time.Now().Add(timeout))
	}
	_, message, err := handler.connection.ReadMessage()
	if err != nil {
		return nil, errors.Wrap(err, "Error reading message")
	}

	packet := &RawIncomingPacket{}
	err = json.Unmarshal(message, packet)
	if err != nil {
		return nil, errors.Wrap(err, "Error unmarshaling packet")
	}

	return packet, nil
}

func (handler *PacketHandler) processIncomingPackets(client *Client) error {
	packet, err := handler.ReadRawPacket(-1)
	if err != nil {
		if client.Disconnecting {
			return nil
		}

		return errors.Wrap(err, "Error reading packet")
	}

	// TODO: only process packets that were sent once a frame or less (60/1000ms)
	//  what do we do with packets sent faster than that?

	switch packet.Code {
	case reflect.TypeOf(CharacterMove{}).Name():
		playerMove := &CharacterMove{}
		err := mapstructure.Decode(packet.Data, playerMove)
		if err != nil {
			return errors.Wrap(err, "Error decoding CharacterMove")
		}
		return playerMove.Handle(client)
	case reflect.TypeOf(InterfaceButtonClick{}).Name():
		interfaceButtonClick := &InterfaceButtonClick{}
		err := mapstructure.Decode(packet.Data, interfaceButtonClick)
		if err != nil {
			return errors.Wrap(err, "Error decoding InterfaceButtonClick")
		}
		return interfaceButtonClick.Handle(client)
	default:
		client.Log.Errorf("Unknown Packet code: %s: %s", packet.Code, packet.Data)
		return errors.Errorf("Unknown Packet code: %s", packet.Code)
	}
}
