package outgoing

type PlayerCharacter struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type PlayerCharacters struct {
	Characters []*PlayerCharacter `json:"characters"`
}
