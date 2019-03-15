package location

type Location struct {
	x int
	y int
}

func NewLocation(x, y int) *Location {
	return &Location{
		x: x,
		y: y,
	}
}

func (loc *Location) GetX() int {
	return loc.x
}

func (loc *Location) GetY() int {
	return loc.y
}
