import * as PIXI from 'pixi.js';
import * as location from "./location";
import * as camera from "./camera";

class Tileset {
    columns: number;
    texture: PIXI.Texture;

    constructor(columns: number, texture: PIXI.Texture) {
        this.columns = columns;
        this.texture = texture;
    }
}

export class Tilemap {
    name: string;

    width: number;
    height: number;

    tilesets: Map<number, Tileset>;

    tileWidth: number;
    tileHeight: number;

    layers: Array<any>;

    spriteCache: Map<string, PIXI.Sprite>;
    tilesetCache: Map<number, Tileset>;

    constructor(name: string) {
        this.name = name;

        this.tilesets = new Map();
        this.spriteCache = new Map();
        this.tilesetCache = new Map();
    }

    load() {
        let tilemapData = PIXI.loader.resources['tilemap' + this.name].data;

        this.tileWidth = tilemapData.tilewidth;
        this.tileHeight = tilemapData.tileheight;

        this.width = tilemapData.width * this.tileWidth;
        this.height = tilemapData.height * this.tileHeight;

        // collect all the tilesets
        for (let i in tilemapData.tilesets) {
            let tileset = tilemapData.tilesets[i];
            let firstGID = tileset.firstgid;
            let texture = PIXI.utils.TextureCache['img' + tileset.name];
            this.tilesets.set(firstGID, new Tileset(tileset.columns, texture));
        }

        // collect all the layers
        this.layers = tilemapData.layers;

    }

    render(container: PIXI.Container, location: location.Location, cam: camera.Camera) {

        // get start and end columns and rows
        let startTileCol = Math.max(Math.floor(cam.x / this.tileWidth) - 5, 0);
        let endTileCol = Math.min(startTileCol + Math.ceil(cam.screenWidth / this.tileWidth) + 5, (this.width / this.tileWidth) - 1);
        let startTileRow = Math.max(Math.floor(cam.y / this.tileHeight) - 5, 0);
        let endTileRow = Math.min(startTileRow + Math.ceil(cam.screenHeight / this.tileHeight) + 5, (this.height / this.tileHeight) - 1);

        // calculate the offset between the camera and start tile
        let offsetX = -cam.x + startTileCol * this.tileWidth;
        let offsetY = -cam.y + startTileRow * this.tileHeight;

        // render all the things
        for (let layerID = 0; layerID < this.layers.length; layerID++) {
            let layer = this.layers[layerID];
            if (layer.type == 'tilelayer') { // only care about tilelayers
                let layerData = layer.data;  // contains all the tile gids

                // layer dimensions
                let layerWidth = layer.width;
                let layerHeight = layer.height;

                // loop all the tiles we can render
                for (let tileX = startTileCol; tileX <= endTileCol; tileX++) {
                    for (let tileY = startTileRow; tileY <= endTileRow; tileY++) {
                        // calculate the tile index
                        let layerTileIndex = (tileY * layerHeight) + tileX;
                        // get the tile GID
                        let layerTileGID = layerData[layerTileIndex];

                        // if the GID is 0 there is nothing to render
                        if (layerTileGID == 0) {
                            continue;
                        }

                        let tile = null;

                        // find the tile's sprite or create a new one
                        let tileSpriteLookup = [layerID, tileX, tileY].join(",");
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
                            for (let firstGID of this.tilesets.keys()) {
                                if (firstGID <= layerTileGID && firstGID > tilesetFirstGID) {
                                    tilesetFirstGID = firstGID;
                                    tileset = this.tilesets.get(firstGID);
                                }
                            }
                            this.tilesetCache.set(layerTileGID, tileset);
                        }

                        // calculate the tile position in the tileset
                        let recX = (layerTileGID % tileset.columns) - 1;
                        let recY = Math.floor(layerTileGID / tileset.columns);

                        // create and set the texture for the tile
                        let tilesetTexture = tileset.texture.clone();
                        tilesetTexture.frame = new PIXI.Rectangle(recX * this.tileWidth, recY * this.tileHeight, this.tileWidth, this.tileHeight);
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
        for (let spriteCacheKeyStr of this.spriteCache.keys()) {
            let spriteCacheKey = spriteCacheKeyStr.split(",");
            let tileX = +spriteCacheKey[1];
            let tileY = +spriteCacheKey[2];

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

    removeSpriteCache(key: string) {
        let sprite = this.spriteCache.get(key);
        sprite.parent.removeChild(sprite);
        sprite.destroy({texture: true});
        this.spriteCache.delete(key);
    }

}