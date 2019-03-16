import { Location } from "./location";

export class Camera {
    public x: number;
    public y: number;
    public readonly screenWidth: number;
    public readonly screenHeight: number;

    constructor(screenWidth: number, screenHeight: number) {
        this.screenWidth = screenWidth;
        this.screenHeight = screenHeight;
    }

    public update(location: Location) {
        const centerX = this.screenWidth / 2;
        const centerY = this.screenHeight / 2;

        let cameraX = location.x - centerX;
        let cameraY = location.y - centerY;
        cameraX = Math.max(0, Math.min(cameraX, (location.world.tilemap.width - this.screenWidth)));
        cameraY = Math.max(0, Math.min(cameraY, (location.world.tilemap.height - this.screenHeight)));

        this.x = cameraX;
        this.y = cameraY;
    }
}
