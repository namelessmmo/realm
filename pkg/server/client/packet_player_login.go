package client

type PlayerLogin struct {
	AccessToken string `mapstructure:"access_token"`
	Screen      struct {
		Width  int `mapstructure:"width"`
		Height int `mapstructure:"height"`
	} `mapstructure:"screen"`
}

func (packet *PlayerLogin) Handle(client *Client) error {
	return nil
}
