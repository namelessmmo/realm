import * as PIXI from "pixi.js";

export class Tileset {
    public columns: number;
    public texture: PIXI.Texture;

    constructor(columns: number, texture: PIXI.Texture) {
        this.columns = columns;
        this.texture = texture;
    }
}
