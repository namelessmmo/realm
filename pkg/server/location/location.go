package location

type Location struct {
	world *World
	x     int
	y     int
}

func NewLocation(world *World, x, y int) *Location {
	return &Location{
		world: world,
		x:     x,
		y:     y,
	}
}

func (loc *Location) GetWorld() *World {
	return loc.world
}

func (loc *Location) GetX() int {
	return loc.x
}

func (loc *Location) GetY() int {
	return loc.y
}
