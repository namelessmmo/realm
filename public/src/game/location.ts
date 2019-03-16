import { World } from "world";

export class Location {
    public readonly x: number;
    public readonly y: number;
    public readonly world: World;

    constructor(x: number, y: number, world: World) {
        this.x = x;
        this.y = y;
        this.world = world;
    }

    public screenX(cameraX: number, renderX: number): number {
        let screenX = renderX / 2;

        if (this.x < screenX || this.x > ((this.world.tilemap.width - renderX) + screenX)) {
            screenX = this.x - cameraX;
        }

        return screenX;
    }

    public screenY(cameraY: number, renderY: number): number {
        let screenY = renderY / 2;

        if (this.y < screenY || this.y > ((this.world.tilemap.height - renderY) + screenY)) {
            screenY = this.y - cameraY;
        }

        return screenY;
    }
}
