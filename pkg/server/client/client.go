package client

import (
	"fmt"
	"net/http"
	"reflect"
	"sync"
	"time"

	jwt "github.com/dgrijalva/jwt-go"
	"github.com/mitchellh/mapstructure"

	"github.com/namelessmmo/realm/pkg/server/packets/outgoing"

	"github.com/namelessmmo/realm/pkg/server/location"

	"github.com/gorilla/websocket"
	"github.com/sirupsen/logrus"
)

type Movement struct {
	Up    bool
	Down  bool
	Left  bool
	Right bool
}

type Character struct {
	ID   int
	Name string

	client *Client

	movementLock sync.Mutex
	movement     *Movement

	location *location.Location

	lastSave time.Time
	saveLock sync.Mutex

	Log *logrus.Entry
}

func NewCharacter(id int, name string, client *Client) *Character {
	return &Character{
		ID:   id,
		Name: name,

		client: client,

		Log: client.Log.WithField("character_id", id).WithField("character_name", name),
	}
}

func (c *Character) GetLocation() *location.Location {
	return c.location
}

func (c *Character) SetLocation(location *location.Location) {
	c.location = location
	c.client.Camera.update(c.location)
}

func (c *Character) Load() error {
	// only basic information of the character is loaded
	// when a player selects the character load the rest
	c.SetLocation(location.NewLocation(location.WorldHandler.GetWorld("untitled"), 400, 400))

	c.lastSave = time.Now()
	c.Log.Infof("Character loaded")
	return nil
}

func (c *Character) Save() error {
	c.saveLock.Lock()
	defer c.saveLock.Unlock()

	c.Log.Infof("Saving character")

	// TODO: save character
	return nil
}

func (c *Character) Process() {
	c.processMovement()
}

func (c *Character) processMovement() {
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

		if x > c.location.GetWorld().GetWidth() {
			x = c.location.GetWorld().GetWidth()
		}

		if y > c.location.GetWorld().GetHeight() {
			y = c.location.GetWorld().GetHeight()
		}

		// TODO: prevent player from walking over blocked tiles (water, buildings, ect...)

		c.SetLocation(location.NewLocation(loc.GetWorld(), x, y))
		c.movement = nil
	}
}

type Client struct {
	ID       int
	Username string

	Characters      []*Character
	Character       *Character
	CharacterToLoad *Character

	Camera       *Camera
	ScreenWidth  int
	ScreenHeight int

	Disconnected  bool
	Disconnecting bool

	PacketHandler *PacketHandler
	clientHandler *Handler

	Log *logrus.Entry
}

func NewClient(connection *websocket.Conn, id int, handler *Handler) *Client {
	return &Client{
		ID: id,

		Characters: make([]*Character, 9),

		Disconnected:  false,
		Disconnecting: false,

		PacketHandler: NewPacketHandler(connection),
		clientHandler: handler,

		Log: logrus.WithField("client_id", id),
	}
}

func (c *Client) GetCharacter() *Character {
	return c.Character
}

func (c *Client) SetCharacter(character *Character) {
	c.Character = character
}

func (c *Client) Run() {
	c.Log.Infof("Client starting")
	c.PacketHandler.Setup()

	rawPacket, err := c.PacketHandler.ReadRawPacket(5 * time.Second)
	if err != nil {
		c.Log.Errorf("Error reading login info: %s", err.Error())
		c.Disconnect(http.StatusRequestTimeout, "Did not receive login info")
		return
	}

	c.Log.Infof("Client logging in")

	playerLogin := &PlayerLogin{}
	packetCode := reflect.TypeOf(playerLogin).Elem().Name()
	if rawPacket.Code != packetCode {
		c.Log.Errorf("Packet %s is not %s", rawPacket.Code, packetCode)
		c.Disconnect(http.StatusMethodNotAllowed, "Received invalid login packet")
		return
	}

	err = mapstructure.Decode(rawPacket.Data, playerLogin)
	if err != nil {
		c.Log.Errorf("Error decoding %s: %s", packetCode, err.Error())
		c.Disconnect(http.StatusBadRequest, "Received invalid login packet")
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
		c.Log.Errorf("Error parsing token %s", err.Error())
		c.Disconnect(http.StatusUnauthorized, "Error parsing token")
		return
	}

	claims := token.Claims.(*jwt.StandardClaims)

	if claims.VerifyExpiresAt(time.Now().Unix(), true) == false {
		c.Disconnect(http.StatusUnauthorized, "Login session expired")
		return
	}

	if claims.VerifyIssuer("my-issuer", true) == false {
		// TODO: return if token is not issued by us
	}

	c.Username = claims.Subject
	c.Log = c.Log.WithField("client_username", c.Username)
	if c.clientHandler.GetClientByUsername(c.Username).ID != c.ID {
		c.Log.Errorf("player is already logged in")
		c.Disconnect(http.StatusConflict, "Already logged into this realm, please wait 60 seconds and try again")
		return
	}
	c.Log.Infof("Client logged in")

	c.ScreenWidth = playerLogin.Screen.Width
	c.ScreenHeight = playerLogin.Screen.Height
	c.Camera = NewCamera(c.ScreenWidth, c.ScreenHeight)
	c.PacketHandler.WritePacket(&outgoing.PlayerInfo{PlayerID: c.ID})

	// TODO: load player characters (only basic info)
	c.Log.Infof("Loading characters")
	c.Characters[0] = NewCharacter(0, "char-name", c)

	playerCharacters := &outgoing.PlayerCharacters{
		Characters: make([]*outgoing.PlayerCharacter, 0),
	}

	for _, character := range c.Characters {
		var playerCharacter *outgoing.PlayerCharacter
		if character != nil {
			playerCharacter = &outgoing.PlayerCharacter{ID: character.ID, Name: character.Name}
		}
		playerCharacters.Characters = append(playerCharacters.Characters, playerCharacter)
	}

	c.PacketHandler.WritePacket(playerCharacters)

	c.Log.Infof("Client ready to select character")

	// do we need to send/receive anything else?

	// client is doing whatever loading things it needs

	// Process packets
	// We process them as fast as they come in
	// This is probably bad so we should figure out a better way
	// currently each client has it's own goroutine, don't really know of a better way currently
	for {
		if c.Disconnecting { // if the client disconnected stop processing incoming packets
			break
		}

		err := c.PacketHandler.processIncomingPackets(c)
		if err != nil {
			c.Log.WithError(err).Errorf("Error processing packets, disconnecting")
			c.Disconnect(http.StatusBadRequest, "Invalid packet sent by client")
			break
		}
	}
}

func (c *Client) Disconnect(code int, message string) {
	if c.Disconnecting {
		return
	}
	c.Log.WithField("disconnect_code", code).WithField("diconnect_message", message).Info("Disconnecting client")
	c.Disconnecting = true

	if c.Character != nil {
		go func() {
			// don't worry about waiting for combat to finish or whatever
			// it's too annoying to deal with
			err := c.Character.Save()
			if err != nil {
				c.Log.Errorf("Error saving player during a disconnect")
			}
			c.Disconnected = true
		}()
	} else {
		c.Disconnected = true
	}

	c.PacketHandler.WritePacket(&outgoing.PlayerDisconnect{Code: code, Message: message})
}

func (c *Client) Process() {
	if c.CharacterToLoad != nil {
		character := c.CharacterToLoad
		c.CharacterToLoad = nil
		go func() {
			err := character.Load()
			if err != nil {
				character.Log.WithError(err).Errorf("Error loading character")
				c.Disconnect(http.StatusInternalServerError, "Error loading character")
				return
			}
			c.Character = character
		}()
		return
	}

	if c.Character != nil {
		c.Character.Process()
	}

}
