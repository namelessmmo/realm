import * as location from './location';
import * as camera from './camera';
import * as PIXI from 'pixi.js';

export class Player {
    id: number;
    location: location.Location;
    graphic: PIXI.Graphics;

    constructor(id: number) {
        this.id = id;
    }

    render(stage: PIXI.Container, relativeLocation: location.Location, cam: camera.Camera) {
        if (!this.graphic) {
            // eventually this will be the player gfx instead of just a circle
            // probably with body part ids, equipment ids, ect..
            let circle = new PIXI.Graphics();
            // if (player.id === myPlayerID) {
            //     circle.beginFill(0x0000FF);
            // } else {
            //     circle.beginFill(0x00FF00);
            // }
            circle.beginFill(0x00FF00);
            circle.drawCircle(0, 0, 10);
            circle.endFill();
            this.graphic = circle;
            stage.addChild(this.graphic);
        }

        let centerX = cam.screenWidth / 2;
        let centerY = cam.screenHeight / 2;

        // relativeLocation is the controlling playe

        let screenX = this.location.screenX(cam.x, cam.screenWidth);
        let screenY = this.location.screenY(cam.y, cam.screenHeight);

        let relX = this.location.x - relativeLocation.x;
        let relY = this.location.y - relativeLocation.y;

        if (relX != 0) {
            if (screenX == centerX) {
                let myCameraX = this.location.x - centerX;
                myCameraX = Math.max(0, Math.min(myCameraX, (this.location.world.tilemap.width - cam.screenWidth)));
                let myScreenX = relativeLocation.screenX(myCameraX, cam.screenWidth);
                screenX = centerX + (this.location.x - centerX);
                if (myScreenX == centerX) {
                    screenX -= (relativeLocation.x - centerX);
                }
                if (myScreenX > centerX) {
                    screenX = this.location.x - cam.x;
                }
            }
        }

        if (relY != 0) {
            if (screenY == centerY) {
                let myCameraY = this.location.y - centerY;
                myCameraY = Math.max(0, Math.min(myCameraY, (this.location.world.tilemap.height - cam.screenHeight)));
                let myScreenY = relativeLocation.screenY(myCameraY, cam.screenHeight);
                screenY = centerY + (this.location.y - centerY);
                if (myScreenY == centerY) {
                    screenY -= (relativeLocation.y - centerY);
                }
                if (myScreenY > centerY) {
                    screenY = this.location.y - cam.y;
                }
            }
        }

        this.graphic.x = screenX;
        this.graphic.y = screenY;
    }

    unRender(stage: PIXI.Container) {
        stage.removeChild(this.graphic);
    }
}