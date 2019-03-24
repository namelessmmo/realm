export class Keyboard {
    public press: () => void;
    public release: () => void;
    private readonly keyCode: string;
    private isDown: boolean;
    private isUp: boolean;

    private readonly keyDown: (event: KeyboardEvent) => void;
    private readonly keyUp: (event: KeyboardEvent) => void;

    public constructor(keyCode: string) {
        this.keyCode = keyCode;

        this.isDown = false;
        this.isUp = true;

        this.press = null;
        this.release = null;

        this.keyDown = (event: KeyboardEvent) => this.downHandler(event);
        this.keyUp = (event: KeyboardEvent) => this.upHandler(event);

        window.addEventListener("keydown", this.keyDown, false);
        window.addEventListener("keyup", this.keyUp, false);
    }

    public destroy() {
        window.removeEventListener("keydown", this.keyDown, false);
        window.removeEventListener("keyup", this.keyUp, false);
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
