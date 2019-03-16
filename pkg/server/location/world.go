package location

type World struct {
	Name string

	tilemap *Tilemap
}

func newWorld(name string, tilemap *Tilemap) *World {
	return &World{
		Name:    name,
		tilemap: tilemap,
	}
}

func (world *World) GetWidth() int {
	return world.tilemap.Width * world.tilemap.TileWidth
}

func (world *World) GetHeight() int {
	return world.tilemap.Height * world.tilemap.TileHeight
}

func (world *World) GetTileWidth() int {
	return world.tilemap.TileWidth
}

func (world *World) GetTileHeight() int {
	return world.tilemap.TileHeight
}

type Tilemap struct {
	Height int `json:"height"`
	Width  int `json:"width"`

	Properties []struct {
		Name  string      `json:"name"`
		Type  string      `json:"type"`
		Value interface{} `json:"value"`
	} `json:"properties"`

	Layers struct {
		Data []int `json:"data"`
	} `json:"layers"`

	TileHeight int `json:"tileheight"`
	TileWidth  int `json:"tilewidth"`
}
