import * as PIXI from "pixi.js";
import * as Game from './game';

class Client {

    // PIXI Stuff
    loader: PIXI.loaders.Loader;
    application: PIXI.Application;

    // World
    world: Game.World;

    // Players
    players: Map<number, Game.Player>;
    myPlayerID: number;
    camera: Game.Camera;

    // socket stuff
    socket: WebSocket;

    // other stuff
    movement: Game.Movement;

    constructor() {
        this.loader = PIXI.loader;
        this.players = new Map();
        this.myPlayerID = -1;
    }

    createApplication() {
        this.application = new PIXI.Application(256, 256, {
            antialias: false,
            transparent: false,
            resolution: 1
        });

        // Fill entire window
        this.application.renderer.view.style.position = "absolute";
        this.application.renderer.view.style.display = "block";
        this.application.renderer.autoResize = true;
        this.application.renderer.resize(window.innerWidth, window.innerHeight);
    }

    loadAssets(cb: Function) {
        this.loader
            .add("tilemapUntitled", "assets/tilemap/untitled.json")
            .add("imgtilesheet", "assets/img/tilesheet.png")
            .load(cb);
    }

    init() {
        this.createApplication();

        let that = this;
        this.loadAssets(function () {
            that.start();
        });
    }

    setupGameKeyboard() { // This will get giant when we add more keybinds so we may want to change this
        // don't send packets here directly
        // just set variables to do that thing
        // i.e movement or clicking a button, ect..
        // this prevents sending a shit ton of packets

        // movement keys
        let keyLeft = new Game.Keyboard('ArrowLeft'),
            keyUp = new Game.Keyboard('ArrowUp'),
            keyRight = new Game.Keyboard('ArrowRight'),
            keyDown = new Game.Keyboard('ArrowDown');
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

    start() {
        // Add canvas to the document
        document.body.appendChild(this.application.view);

        // load the world
        this.world = new Game.World('Untitled');
        this.world.load();

        // setup camera
        this.camera = new Game.Camera(this.application.renderer.width, this.application.renderer.height);

        // start the game and render loops
        this.application.ticker.add(delta => this.gameLoop(delta));
        this.application.ticker.add(delta => this.renderLoop(delta));

        // Connect to the server
        // TODO: ask client for username and password
        // this probably should be moved someplace else
        this.connect("", "");
    }

    connect(username: string, password: string) {
        let loc = window.location, new_uri;
        if (loc.protocol === "https:") {
            new_uri = "wss:";
        } else {
            new_uri = "ws:";
        }
        new_uri += "//" + loc.host;
        new_uri += loc.pathname + "ws";
        let that = this;
        this.socket = new WebSocket(new_uri);
        this.socket.onopen = function (evt) {
            // send login info
            console.log('sending loging info');
            let loginData = JSON.stringify({
                "code": "PlayerLogin",
                "data": {
                    "screen": {
                        "width": that.application.renderer.width,
                        "height": that.application.renderer.height
                    }
                }
            });
            that.socket.send(loginData);
        };
        this.socket.onmessage = function (evt) {
            let evt_data = JSON.parse(evt.data);
            let code = evt_data.code;
            let data = evt_data.data;
            that.processIncomingPackets(code, data);
        };
    }

    processIncomingPackets(code: string, data: any) {
        switch (code) {
            case 'PlayerInfo':
                this.myPlayerID = data.player_id;
                this.movement = new Game.Movement();
                console.log("My Player ID ", this.myPlayerID);
                this.setupGameKeyboard();
                break;
            case 'LocalPlayerState':
                let dataPlayers = data.players;
                let dataPlayerIDs = new Array<number>();
                for (let i = 0; i < dataPlayers.length; i++) {
                    let dataPlayer = dataPlayers[i];
                    dataPlayerIDs.push(dataPlayer.id);

                    if (this.players.has(dataPlayer.id)) {
                        // player is already in the player map
                        // TODO: if a player leaves and another joins faster than the state update this will still be the old player
                        // we probably want some sort of other identifier
                        // or like it doesn't matter because this player object will magically be moved (and gfx set) to the new player
                        let player = this.players.get(dataPlayer.id);
                        // location has immutable fields so we need to create a new one
                        player.location = new Game.Location(dataPlayer.x, dataPlayer.y, this.world);
                        // re-set the player in the map
                        this.players.set(player.id, player);
                    } else {
                        // this is a new player
                        let player = new Game.Player(dataPlayer.id);
                        player.location = new Game.Location(dataPlayer.x, dataPlayer.y, this.world);
                        this.players.set(player.id, player);
                    }
                }

                // remove players that are no longer in the state
                for (let pid of this.players.keys()) {
                    if (!dataPlayerIDs.includes(pid)) {
                        let player = this.players.get(pid);
                        player.unRender(this.application.stage);
                        this.players.delete(player.id);
                    }
                }
                break;
            default:
                console.log("invalid code: ", code);
                break;
        }
    }

    gameLoop(delta: number) {
        if (this.myPlayerID == -1) {
            return;
        }

        if (this.players.has(this.myPlayerID) == false) {
            return;
        }

        if (this.movement.isMoving()) {
            this.socket.send(JSON.stringify({
                "code": "PlayerMove",
                "data": {
                    "up": this.movement.up,
                    "down": this.movement.down,
                    "left": this.movement.left,
                    "right": this.movement.right
                }
            }));
        }

    }

    renderLoop(delta: number) {
        if (this.myPlayerID == -1) {
            return;
        }

        if (this.players.has(this.myPlayerID) == false) {
            return;
        }

        // Going to draw everything relative to myPlayer
        let myPlayer = this.players.get(this.myPlayerID);
        this.camera.update(myPlayer.location); // constantly update the camera location

        // render the world at the player location
        this.world.render(this.application.stage, myPlayer.location, this.camera);

        // TODO: render ground items here

        for (let pid of this.players.keys()) {
            if (pid != this.myPlayerID) {
                let player = this.players.get(pid);
                player.render(this.application.stage, myPlayer.location, this.camera);
            }
        }
        // render self last so we stay on top
        myPlayer.render(this.application.stage, myPlayer.location, this.camera);

        // TODO: render interface stuff here
    }

}

export { Client };