import * as PIXI from "pixi.js";
import * as Game from "./game";

export class Client {

    // PIXI Stuff
    private manifestLoader: PIXI.loaders.Loader;
    private loader: PIXI.loaders.Loader;
    private application: PIXI.Application;

    // World
    private world: Game.World;

    // Players
    private players: Map<number, Game.Player>;
    private myPlayerID: number;
    private camera: Game.Camera;

    // socket stuff
    private socket: WebSocket;

    // other stuff
    private movement: Game.Movement;

    constructor() {
        this.manifestLoader = new PIXI.loaders.Loader();
        this.loader = PIXI.loader;
        this.players = new Map();
        this.myPlayerID = -1;
    }

    public init() {
        this.createApplication();

        const that = this;
        this.loadManifest(() => { // load the manifest
            that.loadAssets(() => { // once it's loaded load all the other assets
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
        this.manifestLoader
            .add("manifest", "manifest.json")
            .load(cb);
    }

    private loadAssets(cb: () => void) {
        let loader = this.loader;
        const manifest = this.manifestLoader.resources.manifest.data;

        for (const key of Object.keys(manifest)) {
            const item = manifest[key];
            loader = loader.add(key, item);
        }

        this.loader = loader.load(cb);
    }

    private setupGameKeyboard() { // This will get giant when we add more keybinds so we may want to change this
        // don't send packets here directly
        // just set variables to do that thing
        // i.e movement or clicking a button, ect..
        // this prevents sending a shit ton of packets

        // movement keys
        const keyLeft = new Game.Keyboard("ArrowLeft");
        const keyUp = new Game.Keyboard("ArrowUp");
        const keyRight = new Game.Keyboard("ArrowRight");
        const keyDown = new Game.Keyboard("ArrowDown");
        keyLeft.press = () => {
            this.movement.left = true;
        };
        keyLeft.release = () => {
            this.movement.left = false;
        };
        keyUp.press = () => {
            this.movement.up = true;
        };
        keyUp.release = () => {
            this.movement.up = false;
        };
        keyRight.press = () => {
            this.movement.right = true;
        };
        keyRight.release = () => {
            this.movement.right = false;
        };
        keyDown.press = () => {
            this.movement.down = true;
        };
        keyDown.release = () => {
            this.movement.down = false;
        };
    }

    private start() {
        // Add canvas to the document
        document.body.appendChild(this.application.view);

        // load the world
        this.world = new Game.World("untitled");
        this.world.load();

        // setup camera
        this.camera = new Game.Camera(this.application.renderer.width, this.application.renderer.height);

        // start the game and render loops
        this.application.ticker.add((delta) => this.gameLoop(delta));
        this.application.ticker.add((delta) => this.renderLoop(delta));

        // Connect to the server
        // TODO: ask client for username and password
        // this probably should be moved someplace else
        this.connect("", "");
    }

    private connect(username: string, password: string) {
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
            console.log("sending loging info");
            const loginData = JSON.stringify({
                code: "PlayerLogin",
                data: {
                    screen: {
                        height: that.application.renderer.height,
                        width: that.application.renderer.width,
                    },
                },
            });
            that.socket.send(loginData);
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
            case "PlayerInfo":
                this.myPlayerID = data.player_id;
                this.movement = new Game.Movement();
                console.log("My Player ID ", this.myPlayerID);
                this.setupGameKeyboard();
                break;
            case "LocalPlayerState":
                const dataPlayers = data.players;
                const dataPlayerIDs = new Array<number>();
                for (const dataPlayer of dataPlayers) {
                    // const dataPlayer = dataPlayers[i];
                    const dataPlayerLocation = dataPlayer.location;
                    dataPlayerIDs.push(dataPlayer.id);

                    if (this.players.has(dataPlayer.id)) {
                        // player is already in the player map
                        // TODO: if a player leaves and another joins faster than the state update this will still be
                        //  the old player
                        // we probably want some sort of other identifier
                        // or like it doesn't matter because this player object will magically be moved (and gfx set)
                        // to the new player
                        const player = this.players.get(dataPlayer.id);
                        // location has immutable fields so we need to create a new one
                        // TODO: use dataPlayerLocation.world for the name of the world
                        player.location = new Game.Location(dataPlayerLocation.x, dataPlayerLocation.y, this.world);
                        // re-set the player in the map
                        this.players.set(player.id, player);
                    } else {
                        // this is a new player
                        const player = new Game.Player(dataPlayer.id);
                        // TODO: use dataPlayerLocation.world for the name of the world
                        player.location = new Game.Location(dataPlayerLocation.x, dataPlayerLocation.y, this.world);
                        this.players.set(player.id, player);
                    }
                }

                // remove players that are no longer in the state
                for (const pid of this.players.keys()) {
                    if (!dataPlayerIDs.includes(pid)) {
                        const player = this.players.get(pid);
                        player.unRender(this.application.stage);
                        this.players.delete(player.id);
                    }
                }
                break;
            case "Ping":
                // This should rarely if ever be used due to other packets being constantly sent
                break;
            default:
                console.log("invalid code: ", code);
                break;
        }
    }

    private gameLoop(delta: number) {
        if (this.myPlayerID === -1) {
            return;
        }

        if (this.players.has(this.myPlayerID) === false) {
            return;
        }

        if (this.movement.isMoving()) {
            this.socket.send(JSON.stringify({
                code: "PlayerMove",
                data: {
                    down: this.movement.down,
                    left: this.movement.left,
                    right: this.movement.right,
                    up: this.movement.up,
                },
            }));
        }

    }

    private renderLoop(delta: number) {
        if (this.myPlayerID === -1) {
            return;
        }

        if (this.players.has(this.myPlayerID) === false) {
            return;
        }

        // Going to draw everything relative to myPlayer
        const myPlayer = this.players.get(this.myPlayerID);
        this.camera.update(myPlayer.location); // constantly update the camera location

        // render the world at the player location
        this.world.render(this.application.stage, myPlayer.location, this.camera);

        // TODO: render ground items here

        for (const pid of this.players.keys()) {
            if (pid !== this.myPlayerID) {
                const player = this.players.get(pid);
                player.render(this.application.stage, myPlayer.location, this.camera);
            }
        }
        // render self last so we stay on top
        myPlayer.render(this.application.stage, myPlayer.location, this.camera);

        // TODO: render interface stuff here
    }

}
