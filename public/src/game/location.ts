import * as world from 'world';

export class Location {
    readonly x: number;
    readonly y: number;
    readonly world: world.World;

    constructor(x: number, y: number, world: world.World) {
        this.x = x;
        this.y = y;
        this.world = world;
    }

    screenX(cameraX: number, renderX: number): number {
        let screenX = renderX / 2;

        if (this.x < screenX || this.x > ((this.world.tilemap.width - renderX) + screenX)) {
            screenX = this.x - cameraX;
        }

        return screenX;
    }

    screenY(cameraY: number, renderY: number): number {
        let screenY = renderY / 2;

        if (this.y < screenY || this.y > ((this.world.tilemap.height - renderY) + screenY)) {
            screenY = this.y - cameraY;
        }

        return screenY;
    }
}