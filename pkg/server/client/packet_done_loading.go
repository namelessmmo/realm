package client

import (
	"net/http"

	"github.com/namelessmmo/realm/pkg/server/packets/outgoing"
	"github.com/pkg/errors"
)

type DoneLoading struct {
	What string `mapstructure:"what"`
}

func (packet *DoneLoading) Handle(client *Client) error {
	switch packet.What {
	case "play":
		character := client.CharacterToLoad
		client.CharacterToLoad = nil
		go func() {
			err := character.Load()
			if err != nil {
				character.Log.WithError(err).Errorf("Error loading character")
				client.Disconnect(http.StatusInternalServerError, "Error loading character")
				return
			}

			client.PacketHandler.WritePacket(&outgoing.WorldData{
				Name:    character.location.GetWorld().Name,
				Tilemap: character.location.GetWorld().Tilemap,
			})

			client.Character = character
		}()
	default:
		return errors.Errorf("Unknown done loading %v", packet.What)
	}

	return nil
}
