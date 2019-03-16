export class Movement {
    public up: boolean;
    public down: boolean;
    public left: boolean;
    public right: boolean;

    constructor() {
        this.up = false;
        this.down = false;
        this.left = false;
        this.right = false;
    }

    public isMoving() {
        return this.up || this.down || this.left || this.right;
    }
}
