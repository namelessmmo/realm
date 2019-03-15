export class Movement {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;

    constructor() {
        this.up = false;
        this.down = false;
        this.left = false;
        this.right = false;
    }

    isMoving() {
        return this.up || this.down || this.left || this.right;
    }
}