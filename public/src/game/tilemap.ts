import * as PIXI from "pixi.js";
import { Camera } from "./camera";
import { Location } from "./location";
import { Tileset } from "./tileset";

export class Tilemap {
    public tileWidth: number;
    public tileHeight: number;

    public width: number;
    public height: number;

    private readonly name: string;
    private readonly tilemapData: any;
    private readonly loader: PIXI.loaders.Loader;

    private tilesets: Map<number, Tileset>;

    private layers: any[];

    private spriteCache: Map<string, PIXI.Sprite>;
    private tilesetCache: Map<number, Tileset>;

    constructor(name: string, tilemapData: any, loader: PIXI.loaders.Loader) {
        this.name = name;
        this.tilemapData = tilemapData;
        this.loader = loader;

        this.tilesets = new Map();
        this.spriteCache = new Map();
        this.tilesetCache = new Map();
    }

    public load() {
        this.tileWidth = this.tilemapData.tilewidth;
        this.tileHeight = this.tilemapData.tileheight;

        this.width = this.tilemapData.width * this.tileWidth;
        this.height = this.tilemapData.height * this.tileHeight;

        // collect all the tilesets
        for (const tileset of this.tilemapData.tilesets) {
            const firstGID = tileset.firstgid;
            const texture = this.loader.resources[`img/tilemap-${this.name}-${tileset.name}`].texture;
            this.tilesets.set(firstGID, new Tileset(tileset.columns, texture));
        }

        // collect all the layers
        this.layers = this.tilemapData.layers;
    }

    public render(container: PIXI.Container, location: Location, camera: Camera) {

        // get start and end columns and rows
        const startTileCol = Math.max(Math.floor(camera.x / this.tileWidth) - 5, 0);
        const endTileCol = Math.min(startTileCol + Math.ceil(camera.screenWidth / this.tileWidth) + 5,
            (this.width / this.tileWidth) - 1);
        const startTileRow = Math.max(Math.floor(camera.y / this.tileHeight) - 5, 0);
        const endTileRow = Math.min(startTileRow + Math.ceil(camera.screenHeight / this.tileHeight) + 5,
            (this.height / this.tileHeight) - 1);

        // calculate the offset between the camera and start tile
        const offsetX = -camera.x + startTileCol * this.tileWidth;
        const offsetY = -camera.y + startTileRow * this.tileHeight;

        // render all the things
        for (let layerID = 0; layerID < this.layers.length; layerID++) {
            const layer = this.layers[layerID];
            if (layer.type === "tilelayer") { // only care about tilelayers
                const layerData = layer.data;  // contains all the tile gids

                // layer dimensions
                const layerWidth = layer.width;
                const layerHeight = layer.height;

                // loop all the tiles we can render
                for (let tileX = startTileCol; tileX <= endTileCol; tileX++) {
                    for (let tileY = startTileRow; tileY <= endTileRow; tileY++) {
                        // calculate the tile index
                        const layerTileIndex = (tileY * layerHeight) + tileX;
                        // get the tile GID
                        const layerTileGID = layerData[layerTileIndex];

                        // if the GID is 0 there is nothing to render
                        if (layerTileGID === 0) {
                            continue;
                        }

                        let tile = null;

                        // find the tile's sprite or create a new one
                        const tileSpriteLookup = [layerID, tileX, tileY].join(",");
                        if (this.spriteCache.has(tileSpriteLookup)) {
                            tile = this.spriteCache.get(tileSpriteLookup);
                        } else {
                            tile = new PIXI.Sprite();
                            this.spriteCache.set(tileSpriteLookup, tile);
                            container.addChild(tile);
                        }

                        // find the tileset for the tile's GID
                        let tileset: Tileset = null;
                        if (this.tilesetCache.has(layerTileGID)) {
                            tileset = this.tilesetCache.get(layerTileGID);
                        } else {
                            let tilesetFirstGID = 0;
                            for (const firstGID of this.tilesets.keys()) {
                                if (firstGID <= layerTileGID && firstGID > tilesetFirstGID) {
                                    tilesetFirstGID = firstGID;
                                    tileset = this.tilesets.get(firstGID);
                                }
                            }
                            this.tilesetCache.set(layerTileGID, tileset);
                        }

                        // calculate the tile position in the tileset
                        const recX = (layerTileGID % tileset.columns) - 1;
                        const recY = Math.floor(layerTileGID / tileset.columns);

                        // create and set the texture for the tile
                        const tilesetTexture = tileset.texture.clone();
                        tilesetTexture.frame = new PIXI.Rectangle(recX * this.tileWidth, recY * this.tileHeight,
                            this.tileWidth, this.tileHeight);
                        tile.texture = tilesetTexture;

                        // set the tile on screen position and update the cache
                        tile.x = Math.round(tileX - startTileCol) * this.tileWidth + offsetX;
                        tile.y = Math.round(tileY - startTileRow) * this.tileWidth + offsetY;
                        this.spriteCache.set(tileSpriteLookup, tile);
                    }
                }
            }
        }

        // Remove tiles we aren't rendering
        for (const spriteCacheKeyStr of this.spriteCache.keys()) {
            const spriteCacheKey = spriteCacheKeyStr.split(",");
            const tileX = +spriteCacheKey[1];
            const tileY = +spriteCacheKey[2];

            if (tileX < startTileCol || tileX > endTileCol) {
                this.removeSpriteCache(spriteCacheKeyStr);
                continue;
            }

            if (tileY < startTileRow || tileY > endTileRow) {
                this.removeSpriteCache(spriteCacheKeyStr);
                continue;
            }
        }
    }

    private removeSpriteCache(key: string) {
        const sprite = this.spriteCache.get(key);
        sprite.parent.removeChild(sprite);
        sprite.destroy({texture: true});
        this.spriteCache.delete(key);
    }

}
