package outgoing

type CharacterStateLocation struct {
	World string `json:"world"`
	X     int    `json:"x"`
	Y     int    `json:"y"`
}

type CharacterState struct {
	ID       int                    `json:"id"`
	PlayerID int                    `json:"player_id"`
	Location CharacterStateLocation `json:"location"`
}

type LocalCharacterState struct {
	Characters []CharacterState `json:"characters"`
}
