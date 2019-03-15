import * as location from './location';

export class Camera {
    screenWidth: number;
    screenHeight: number;

    x: number;
    y: number;

    constructor(screenWidth: number, screenHeight: number) {
        this.screenWidth = screenWidth;
        this.screenHeight = screenHeight;
    }

    update(location: location.Location) {
        let centerX = this.screenWidth / 2;
        let centerY = this.screenHeight / 2;

        let cameraX = location.x - centerX;
        let cameraY = location.y - centerY;
        cameraX = Math.max(0, Math.min(cameraX, (location.world.tilemap.width - this.screenWidth)));
        cameraY = Math.max(0, Math.min(cameraY, (location.world.tilemap.height - this.screenHeight)));

        this.x = cameraX;
        this.y = cameraY;
    }
}