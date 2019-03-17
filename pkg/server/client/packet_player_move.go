package client

type PlayerMove struct {
	Up    bool `mapstructure:"up"`
	Down  bool `mapstructure:"down"`
	Left  bool `mapstructure:"left"`
	Right bool `mapstructure:"right"`
}

func (packet *PlayerMove) Handle(client *Client) error {
	if client.movement != nil {
		// There already is a movement so wait for it to process
		return nil
	}
	client.movementLock.Lock()
	defer client.movementLock.Unlock()
	client.movement = &Movement{
		Up:    packet.Up,
		Down:  packet.Down,
		Left:  packet.Left,
		Right: packet.Right,
	}

	return nil
}
