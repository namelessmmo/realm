package client

type CharacterMove struct {
	Up    bool `mapstructure:"up"`
	Down  bool `mapstructure:"down"`
	Left  bool `mapstructure:"left"`
	Right bool `mapstructure:"right"`
}

func (packet *CharacterMove) Handle(client *Client) error {
	character := client.GetCharacter()
	if character == nil {
		// Someone is being dump and trying to move without a character
		return nil
	}

	if character.movement != nil {
		// There already is a movement so wait for it to process
		return nil
	}
	character.movement = &Movement{
		Up:    packet.Up,
		Down:  packet.Down,
		Left:  packet.Left,
		Right: packet.Right,
	}

	return nil
}
