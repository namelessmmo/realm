package client

import (
	"math"

	"github.com/namelessmmo/realm/pkg/server/location"
)

type Camera struct {
	screenWidth  int
	screenHeight int

	Location *location.Location
}

func NewCamera(screenWidth, screenHeight int) *Camera {
	return &Camera{
		screenWidth:  screenWidth,
		screenHeight: screenHeight,
	}
}

func (camera *Camera) update(loc *location.Location) {
	world := loc.GetWorld()
	centerX := camera.screenWidth / 2
	centerY := camera.screenHeight / 2

	cameraX := loc.GetX() - centerX
	cameraY := loc.GetY() - centerY
	cameraX = int(math.Max(0, math.Min(float64(cameraX), float64(world.GetWidth()-camera.screenWidth))))
	cameraY = int(math.Max(0, math.Min(float64(cameraY), float64(world.GetHeight()-camera.screenHeight))))

	camera.Location = location.NewLocation(loc.GetWorld(), cameraX, cameraY)
}
