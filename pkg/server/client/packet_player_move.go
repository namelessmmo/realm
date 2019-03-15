package client

type PlayerMove struct {
	Up    bool `json:"up"`
	Down  bool `json:"down"`
	Left  bool `json:"left"`
	Right bool `json:"right"`
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
