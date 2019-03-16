package outgoing

type PlayerStateLocation struct {
	World string `json:"world"`
	X     int    `json:"x"`
	Y     int    `json:"y"`
}

type PlayerState struct {
	ID       int                 `json:"id"`
	Location PlayerStateLocation `json:"location"`
}

type LocalPlayerState struct {
	Players []PlayerState `json:"players"`
}
