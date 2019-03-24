package client

import (
	"github.com/namelessmmo/realm/pkg/server/packets/outgoing"
	"github.com/pkg/errors"
)

type InterfaceButtonClick struct {
	InterfaceID int `mapstructure:"interface_id"`
	ButtonID    int `mapstructure:"button_id"`
}

func (packet *InterfaceButtonClick) Handle(client *Client) error {

	// TODO: button clicks need a cooldown to prevent players from spam clicking

	client.Log.Infof("Button Clicked %v:%v", packet.InterfaceID, packet.ButtonID)
	switch packet.InterfaceID {
	case 2:
		if client.Character != nil {
			// client tried to select a character while one is already loaded
			return nil
		}

		character := client.Characters[packet.ButtonID]
		if character == nil {
			//TODO: open character creation interface
		} else {
			if client.CharacterToLoad != nil {
				// client already selected a character and we are still loading that
				return nil
			}

			client.CharacterToLoad = character
			client.PacketHandler.WritePacket(&outgoing.CharacterLoading{CharacterID: character.ID})
			client.Log.WithField("character_id", character.ID).Info("Client selected character")
		}
	default:
		client.Log.Errorf("Unknown interface %v", packet.InterfaceID)
		return errors.Errorf("Unknown interface %v", packet.InterfaceID)
	}

	return nil
}
