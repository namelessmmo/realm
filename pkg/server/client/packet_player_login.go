package client

type PlayerLogin struct {
	Username string `json:"username"`
	Password string `json:"password"`
	Screen   struct {
		Width  int `json:"width"`
		Height int `json:"height"`
	} `json:"screen"`
}

func (packet *PlayerLogin) Handle(client *Client) error {
	return nil
}
