package client

import (
	"fmt"
	"reflect"
	"sync"
	"time"

	jwt "github.com/dgrijalva/jwt-go"
	"github.com/mitchellh/mapstructure"

	"github.com/namelessmmo/realm/pkg/server/packets/outgoing"

	"github.com/namelessmmo/realm/pkg/server/location"

	"github.com/gorilla/websocket"
	"github.com/pkg/errors"
	"github.com/sirupsen/logrus"
)

type Movement struct {
	Up    bool
	Down  bool
	Left  bool
	Right bool
}

type Client struct {
	ID          int
	Username    string
	Initialized bool

	location *location.Location

	Camera       *Camera
	ScreenWidth  int
	ScreenHeight int

	Disconnected bool

	PacketHandler *PacketHandler
	clientHandler *Handler

	movementLock sync.Mutex
	movement     *Movement
}

func NewClient(connection *websocket.Conn, id int, handler *Handler) *Client {
	return &Client{
		ID:          id,
		Initialized: false,

		Disconnected: false,

		PacketHandler: NewPacketHandler(connection),
		clientHandler: handler,
	}
}

func (c *Client) GetLocation() *location.Location {
	return c.location
}

func (c *Client) SetLocation(location *location.Location) {
	c.location = location
	c.Camera.update(c.location)
}

func (c *Client) Run() {
	disconnectMessage := "Unknown Reason"

	c.PacketHandler.setup()

	defer func() {
		c.Disconnect(disconnectMessage)
	}()

	rawPacket, err := c.PacketHandler.ReadRawPacket(5 * time.Second)
	if err != nil {
		logrus.Errorf("Error reading login info: %s", err.Error())
		disconnectMessage = "Did not receive login info"
		return
	}

	playerLogin := &PlayerLogin{}
	packetCode := reflect.TypeOf(playerLogin).Elem().Name()
	if rawPacket.Code != packetCode {
		logrus.Errorf("Packet %s is not %s", rawPacket.Code, packetCode)
		disconnectMessage = "Received invalid login packet"
		return
	}

	err = mapstructure.Decode(rawPacket.Data, playerLogin)
	if err != nil {
		logrus.Errorf("Error decoding %s: %s", packetCode, err.Error())
		disconnectMessage = "Error parsing PlayerLogin"
		return
	}

	token, err := jwt.ParseWithClaims(playerLogin.AccessToken, &jwt.StandardClaims{}, func(token *jwt.Token) (interface{}, error) {
		// Don't forget to validate the alg is what you expect:
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("Unexpected signing method: %v", token.Header["alg"])
		}

		// hmacSampleSecret is a []byte containing your secret, e.g. []byte("my_secret_key")
		return []byte(c.clientHandler.HMACString), nil
	})
	if err != nil {
		logrus.Errorf("Error parsing token %s", err.Error())
		disconnectMessage = "Error parsing token"
		return
	}

	c.Username = token.Claims.(*jwt.StandardClaims).Subject
	logrus.Infof("Username: %s", c.Username)
	if c.clientHandler.GetClientByUsername(c.Username).ID != c.ID {
		logrus.Infof("player is already logged in")
		disconnectMessage = "Already logged into this server"
		return
	}

	// TODO: eventually client will select their character before the rest of this takes place

	c.ScreenWidth = playerLogin.Screen.Width
	c.ScreenHeight = playerLogin.Screen.Height
	c.Camera = NewCamera(c.ScreenWidth, c.ScreenHeight)

	// load player data

	// send player information
	// id, ect...

	c.SetLocation(location.NewLocation(location.WorldHandler.GetWorld("untitled"), 400, 400))
	c.PacketHandler.WritePacket(&outgoing.PlayerInfo{PlayerID: c.ID})

	// do we need to send/receive anything else?

	// client is doing whatever loading things it needs

	c.Initialized = true

	// Process packets
	// We process them as fast as they come in
	// This is probably bad so we should figure out a better way
	// currently each client has it's own goroutine, don't really know of a better way currently
	for {
		err := c.PacketHandler.processIncomingPackets(c)
		if err != nil {
			logrus.Errorf(errors.Wrap(err, "Error processing packets, disconnecting").Error())
			break
		}
	}
	disconnectMessage = "Incoming packets stopped processing"
}

func (c *Client) Disconnect(text string) {
	_ = c.PacketHandler.Close(websocket.CloseNormalClosure, text)
	c.Disconnected = true
}

func (c *Client) Process() {
	c.processMovement()
}

func (c *Client) processMovement() {
	if c.movement != nil {
		c.movementLock.Lock()
		defer c.movementLock.Unlock()
		loc := c.GetLocation()
		x := loc.GetX()
		y := loc.GetY()

		if c.movement.Up { // up is actually negative
			y = y - 1
		}
		if c.movement.Down { // down is actually positive
			y = y + 1
		}
		if c.movement.Right {
			x = x + 1
		}
		if c.movement.Left {
			x = x - 1
		}

		if x < 0 {
			x = 0
		}
		if y < 0 {
			y = 0
		}

		// TODO: limit x and y to the size of the map

		// TODO: prevent player from walking over blocked tiles (water, buildings, ect...)

		c.SetLocation(location.NewLocation(loc.GetWorld(), x, y))
		c.movement = nil
	}
}
