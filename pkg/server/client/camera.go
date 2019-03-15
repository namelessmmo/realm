package client

import (
	"github.com/namelessmmo/realm/pkg/server/location"
	"math"
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

func (camera *Camera) update(location *location.Location) {
	centerX := camera.screenWidth / 2
	centerY := camera.screenHeight / 2

	cameraX := location.GetX() - centerX
	cameraY := location.GetY() - centerY
	cameraX = int(math.Max(0, math.Min(float64(cameraX), float64(0-camera.screenWidth))))  // TODO: replace 2nd 0 with tilemap width
	cameraY = int(math.Max(0, math.Min(float64(cameraY), float64(0-camera.screenHeight)))) // TODO: replace 2nd 0 with tilemap height
}
