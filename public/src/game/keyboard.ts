export class Keyboard {
    keyCode: string;

    isDown: boolean;
    isUp: boolean;

    press: Function;
    release: Function;

    constructor(keyCode: string) {
        this.keyCode = keyCode;

        this.isDown = false;
        this.isUp = true;

        this.press = null;
        this.release = null;

        window.addEventListener('keydown', event => this.downHandler(event), false);
        window.addEventListener('keyup', event => this.upHandler(event), false);
    }

    downHandler(event: KeyboardEvent) {
        if (event.key == this.keyCode) {
            if (this.isUp && this.press != null) {
                this.press();
                this.isDown = true;
                this.isUp = false;
                event.preventDefault();
            }
        }
    }

    upHandler(event: KeyboardEvent) {
        if (event.key == this.keyCode) {
            if (this.isDown && this.release != null) {
                this.release();
                this.isDown = false;
                this.isUp = true;
                event.preventDefault();
            }
        }
    }

}