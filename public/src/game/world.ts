import * as PIXI from "pixi.js";
import * as camera from "./camera";
import * as location from "./location";
import * as tilemap from "./tilemap";

export class World {
    public readonly tilemap: tilemap.Tilemap;
    private readonly container: PIXI.Container;

    constructor(tileMapName: string, loader: PIXI.loaders.Loader) {
        this.container = new PIXI.Container();

        this.tilemap = new tilemap.Tilemap(tileMapName, loader);
    }

    public load() {
        this.tilemap.load();
    }

    public render(stage: PIXI.Container, loc: location.Location, cam: camera.Camera) {
        this.tilemap.render(this.container, loc, cam);
        try {
            // if the world is already added to the stage don't add it again
            stage.getChildIndex(this.container);
        } catch (e) {
            stage.addChild(this.container);
        }

        // TODO: render objects here (objects sync from server)
    }

    public unRender() {
        this.container.parent.removeChild(this.container);
    }
}
