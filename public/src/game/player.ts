import * as PIXI from "pixi.js";
import { Camera } from "./camera";
import { Location } from "./location";

export class Player {
    public id: number;
    public location: Location;
    public graphic: PIXI.Graphics;

    constructor(id: number) {
        this.id = id;
    }

    public render(stage: PIXI.Container, relativeLocation: Location, camera: Camera) {
        if (!this.graphic) {
            // eventually this will be the player gfx instead of just a circle
            // probably with body part ids, equipment ids, ect..
            const circle = new PIXI.Graphics();
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

        const centerX = camera.screenWidth / 2;
        const centerY = camera.screenHeight / 2;

        // relativeLocation is the controlling player

        let screenX = this.location.screenX(camera.x, camera.screenWidth);
        let screenY = this.location.screenY(camera.y, camera.screenHeight);

        const relX = this.location.x - relativeLocation.x;
        const relY = this.location.y - relativeLocation.y;

        if (relX !== 0) {
            if (screenX === centerX) {
                let myCameraX = this.location.x - centerX;
                myCameraX = Math.max(0, Math.min(myCameraX, (this.location.world.tilemap.width - camera.screenWidth)));
                const myScreenX = relativeLocation.screenX(myCameraX, camera.screenWidth);
                screenX = centerX + (this.location.x - centerX);
                if (myScreenX === centerX) {
                    screenX -= (relativeLocation.x - centerX);
                }
                if (myScreenX > centerX) {
                    screenX = this.location.x - camera.x;
                }
            }
        }

        if (relY !== 0) {
            if (screenY === centerY) {
                let myCameraY = this.location.y - centerY;
                myCameraY = Math.max(0, Math.min(myCameraY,
                    (this.location.world.tilemap.height - camera.screenHeight)));
                const myScreenY = relativeLocation.screenY(myCameraY, camera.screenHeight);
                screenY = centerY + (this.location.y - centerY);
                if (myScreenY === centerY) {
                    screenY -= (relativeLocation.y - centerY);
                }
                if (myScreenY > centerY) {
                    screenY = this.location.y - camera.y;
                }
            }
        }

        this.graphic.x = screenX;
        this.graphic.y = screenY;
    }

    public unRender(stage: PIXI.Container) {
        stage.removeChild(this.graphic);
    }
}
