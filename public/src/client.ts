import * as Cookies from "js-cookie";
import * as PIXI from "pixi.js";
import { SceneManager } from "./engine/scene_manager";

export class Client {

    // PIXI Stuff
    private loader: PIXI.loaders.Loader;
    private application: PIXI.Application;

    // Scene
    private sceneManager: SceneManager;

    // socket stuff
    private socket: WebSocket;

    constructor() {
        this.loader = PIXI.loader;
    }

    public init() {
        this.createApplication();

        this.sceneManager = new SceneManager(this.application.stage);

        const that = this;
        this.loadManifest(() => { // load the manifest
            this.sceneManager.loadManager(() => {
                that.start();
            });
        });
    }

    private createApplication() {
        this.application = new PIXI.Application(256, 256, {
            antialias: true,
            resolution: 1,

            transparent: false,
        });

        // Fill entire window
        this.application.renderer.view.style.position = "absolute";
        this.application.renderer.view.style.display = "block";
        this.application.renderer.autoResize = true;
        this.application.renderer.resize(window.innerWidth, window.innerHeight);
    }

    private loadManifest(cb: () => void) {
        this.loader
            .add("manifest", "manifest.json")
            .load(cb);
    }

    // private setupGameKeyboard() { // This will get giant when we add more keybinds so we may want to change this
    //     // don't send packets here directly
    //     // just set variables to do that thing
    //     // i.e movement or clicking a button, ect..
    //     // this prevents sending a shit ton of packets
    //
    //     // movement keys
    //     const keyLeft = new Game.Keyboard("ArrowLeft");
    //     const keyUp = new Game.Keyboard("ArrowUp");
    //     const keyRight = new Game.Keyboard("ArrowRight");
    //     const keyDown = new Game.Keyboard("ArrowDown");
    //     keyLeft.press = () => {
    //         this.movement.left = true;
    //     };
    //     keyLeft.release = () => {
    //         this.movement.left = false;
    //     };
    //     keyUp.press = () => {
    //         this.movement.up = true;
    //     };
    //     keyUp.release = () => {
    //         this.movement.up = false;
    //     };
    //     keyRight.press = () => {
    //         this.movement.right = true;
    //     };
    //     keyRight.release = () => {
    //         this.movement.right = false;
    //     };
    //     keyDown.press = () => {
    //         this.movement.down = true;
    //     };
    //     keyDown.release = () => {
    //         this.movement.down = false;
    //     };
    // }

    private start() {
        // Add canvas to the document
        document.body.appendChild(this.application.view);

        // start the game and render loops
        this.application.ticker.add((delta) => this.gameLoop(delta));
        this.application.ticker.add((delta) => this.renderLoop(delta));

        // stop the shared ticker
        PIXI.ticker.shared.stop();

        // load auth cookie
        const cookie = Cookies.get("namelessmmo_auth-session");

        if (cookie === undefined) {
            this.sceneManager.loadScene.setMessage(-1, "You are not logged into NamelessMMO");
            return;
        }

        const cookieData = JSON.parse(cookie);
        const authData = cookieData.authenticated;
        if (authData.hasOwnProperty("access_token") === false) {
            this.sceneManager.loadScene.setMessage(-1, "You are not logged into NamelessMMO");
            return;
        }

        if (authData.expires_at < Date.now()) {
            this.sceneManager.loadScene.setMessage(-1, "Your login session expired, please login again.");
            return;
        }
        const accessToken = authData.access_token;

        this.connect(accessToken);
    }

    private connect(accessToken: string) {
        this.sceneManager.loadScene.setMessage(0, "Connecting...");
        const loc = window.location;
        let newUri;
        if (loc.protocol === "https:") {
            newUri = "wss:";
        } else {
            newUri = "ws:";
        }
        newUri += "//" + loc.host;
        newUri += loc.pathname + "ws";
        const that = this;
        this.socket = new WebSocket(newUri);
        this.socket.onopen = (evt) => {
            // send login info
            that.sceneManager.socket = that.socket;
            that.sceneManager.loadScene.setMessage(200, "Logging in...");
            const loginData = JSON.stringify({
                code: "PlayerLogin",
                data: {
                    access_token: accessToken,
                    screen: {
                        height: that.application.renderer.height,
                        width: that.application.renderer.width,
                    },
                },
            });
            that.socket.send(loginData);
        };
        this.socket.onerror = (evt) => {
            that.sceneManager.loadScene.setMessage(-1, "Error connecting to Realm");
        };
        this.socket.onclose = (evt) => {
            console.log("websocket closed");
        };
        this.socket.onmessage = (evt) => {
            const evtData = JSON.parse(evt.data);
            const code = evtData.code;
            const data = evtData.data;
            that.processIncomingPackets(code, data);
        };
    }

    private processIncomingPackets(code: string, data: any) {
        switch (code) {
            case "Ping":
                // This should rarely if ever be used due to other packets being constantly sent
                // TODO: do we need to send a pong back?
                break;
            case "PlayerDisconnect":
                this.sceneManager.loadScene.setMessage(data.code, data.message);
                this.sceneManager.setScene(null);
                break;
            default:
                this.sceneManager.processPackets(code, data);
                break;
        }
    }

    private gameLoop(delta: number) {
        this.sceneManager.update();
    }

    private renderLoop(delta: number) {
        // TODO: support scaling to the browser size
        this.sceneManager.render(this.application.renderer.width, this.application.renderer.height);
    }

}
