package outgoing

import "github.com/namelessmmo/realm/pkg/server/location"

type WorldData struct {
	Name    string            `json:"name"`
	Tilemap *location.Tilemap `json:"tilemap"`
}
