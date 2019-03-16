export class Keyboard {
    public press: () => void;
    public release: () => void;
    private readonly keyCode: string;
    private isDown: boolean;
    private isUp: boolean;

    constructor(keyCode: string) {
        this.keyCode = keyCode;

        this.isDown = false;
        this.isUp = true;

        this.press = null;
        this.release = null;

        window.addEventListener("keydown", (event) => this.downHandler(event), false);
        window.addEventListener("keyup", (event) => this.upHandler(event), false);
    }

    private downHandler(event: KeyboardEvent) {
        if (event.key === this.keyCode) {
            if (this.isUp && this.press != null) {
                this.press();
                this.isDown = true;
                this.isUp = false;
                event.preventDefault();
            }
        }
    }

    private upHandler(event: KeyboardEvent) {
        if (event.key === this.keyCode) {
            if (this.isDown && this.release != null) {
                this.release();
                this.isDown = false;
                this.isUp = true;
                event.preventDefault();
            }
        }
    }

}
