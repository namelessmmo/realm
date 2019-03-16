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
	"github.com/sirupsen/logrus"
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
}

func NewPacketHandler(connection *websocket.Conn) *PacketHandler {
	return &PacketHandler{
		connection: connection,
		sendBuffer: make(chan outgoing.OutgoingPacket, 64),
	}
}

func (handler *PacketHandler) setup() {
	handler.connection.SetReadLimit(1024) // TODO: figure out the correct size
	handler.connection.SetPongHandler(func(appData string) error {
		_ = handler.connection.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})
}

func (handler *PacketHandler) WritePacket(packet outgoing.OutgoingPacket) {
	handler.sendBuffer <- packet
}

func (handler *PacketHandler) Close(closeCode int, text string) error {
	handler.closeData = websocket.FormatCloseMessage(closeCode, text)
	close(handler.sendBuffer)
	return nil
}

func (handler *PacketHandler) ProcessOutgoingPackets() {
	select {
	case packet, ok := <-handler.sendBuffer:
		_ = handler.connection.SetWriteDeadline(time.Now().Add(5 * time.Second))
		if !ok {
			// send channel was closed, client needs to be disconnected
			_ = handler.connection.WriteMessage(websocket.CloseMessage, handler.closeData)
			return
		}

		// write the current packet
		_ = handler.connection.WriteJSON(map[string]interface{}{"code": reflect.TypeOf(packet).Elem().Name(), "data": packet})
	default:
		if time.Now().Before(handler.lastPing.Add(pingPeriod)) {
			return
		}

		handler.lastPing = time.Now()
		handler.WritePacket(&outgoing.Ping{})
	}
}

func (handler *PacketHandler) ReadRawPacket(timeout time.Duration) (*RawIncomingPacket, error) {
	defer func() {
		handler.readLock.Unlock()
		_ = handler.connection.SetReadDeadline(time.Time{})
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
		return errors.Wrap(err, "Error reading packet")
	}

	switch packet.Code {
	case reflect.TypeOf(PlayerMove{}).Name():
		playerMove := &PlayerMove{}
		err := mapstructure.Decode(packet.Data, playerMove)
		if err != nil {
			return errors.Wrap(err, "Error decoding PlayerMove")
		}
		_ = playerMove.Handle(client)
	default:
		logrus.Errorf("Unknown Packet code: %s: %s", packet.Code, packet.Data)
		return errors.Errorf("Unknown Packet code: %s", packet.Code)
	}

	return nil
}
