import * as PIXI from 'pixi.js';
import * as location from './location';
import * as tilemap from './tilemap';
import * as camera from './camera';

export class World {
    container: PIXI.Container;
    tilemap: tilemap.Tilemap;

    constructor(tileMapName: string) {
        this.container = new PIXI.Container();

        this.tilemap = new tilemap.Tilemap(tileMapName);
    }

    load() {
        this.tilemap.load();
    }

    render(stage: PIXI.Container, location: location.Location, cam: camera.Camera) {
        this.tilemap.render(this.container, location, cam);
        try {
            // if the world is already added to the stage don't add it again
            stage.getChildIndex(this.container);
        } catch (e) {
            stage.addChild(this.container);
        }

        // TODO: render objects here (objects sync from server)
    }
}