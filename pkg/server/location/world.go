package location

type World struct {
	Name string

	Tilemap *Tilemap
}

func newWorld(name string, tilemap *Tilemap) *World {
	return &World{
		Name:    name,
		Tilemap: tilemap,
	}
}

func (world *World) GetWidth() int {
	return world.Tilemap.Width * world.Tilemap.TileWidth
}

func (world *World) GetHeight() int {
	return world.Tilemap.Height * world.Tilemap.TileHeight
}

func (world *World) GetTileWidth() int {
	return world.Tilemap.TileWidth
}

func (world *World) GetTileHeight() int {
	return world.Tilemap.TileHeight
}

type Tilemap struct {
	Height int `json:"height"`
	Width  int `json:"width"`

	Properties []struct {
		Name  string      `json:"name"`
		Type  string      `json:"type"`
		Value interface{} `json:"value"`
	} `json:"properties"`

	Layers []struct {
		Data   []int  `json:"data"`
		Height int    `json:"height"`
		Width  int    `json:"width"`
		Type   string `json:"type"`
	} `json:"layers"`

	Tilesets []struct {
		Columns  int    `json:"columns"`
		FirstGID int    `json:"firstgid"`
		Image    string `json:"image"`
		Name     string `json:"name"`
	} `json:"tilesets"`

	TileHeight int `json:"tileheight"`
	TileWidth  int `json:"tilewidth"`
}
