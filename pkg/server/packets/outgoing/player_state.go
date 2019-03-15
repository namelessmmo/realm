package outgoing

type PlayerState struct {
	ID int `json:"id"`
	X  int `json:"x"`
	Y  int `json:"y"`
}

type LocalPlayerState struct {
	Players []PlayerState `json:"players"`
}
