package location

import (
	"encoding/json"
	"io/ioutil"
	"os"
	"path"
	"path/filepath"
	"strings"

	"github.com/sirupsen/logrus"
)

var WorldHandler *handler

func init() {
	WorldHandler = &handler{worlds: make(map[string]*World)}
	WorldHandler.loadWorlds()
}

type handler struct {
	worlds map[string]*World
}

func (h *handler) GetWorld(name string) *World {
	return h.worlds[name]
}

func (h *handler) loadWorlds() {
	cwd, _ := os.Getwd()
	tilemapDir := path.Join(cwd, "public", "src", "assets", "scenes", "play", "tilemap")
	files, err := ioutil.ReadDir(tilemapDir)
	if err != nil {
		logrus.Fatalf("Error reading tilemap directory %s", err.Error())
	}

	for _, f := range files {
		tilemapData, err := ioutil.ReadFile(path.Join(tilemapDir, f.Name()))
		if err != nil {
			logrus.Fatalf("Error reading tilemap %s:%s", f.Name(), err.Error())
		}

		tilemap := &Tilemap{}
		_ = json.Unmarshal(tilemapData, tilemap)

		name := strings.TrimSuffix(f.Name(), filepath.Ext(f.Name()))
		if _, ok := h.worlds[name]; ok {
			logrus.Fatalf("Tilemap %s has the same name as another tilemap", f.Name())
		}

		world := newWorld(name, tilemap)
		h.worlds[name] = world
	}
}
