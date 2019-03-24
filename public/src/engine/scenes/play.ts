import { Camera } from "../../game/camera";
import { Character } from "../../game/character";
import { Keyboard } from "../../game/keyboard";
import { Location } from "../../game/location";
import { Movement } from "../../game/movement";
import { World } from "../../game/world";
import { Scene } from "../scene";

export class Play extends Scene {

    private readonly playerID: number;

    private world: World;
    private renderedWorld: World;
    private localCharacters: Map<number, Character>;
    private camera: Camera;
    private movement: Movement;

    public constructor(playerID: number) {
        super("play");

        this.playerID = playerID;
        this.localCharacters = new Map();
    }

    public _load(cb: () => void): void {
        for (const key of Array.from(this.manifest.keys())) {
            this.loader.add(key, this.manifest.get(key));
        }

        this.loader.load(cb);
    }

    public _unload(): void {
        this.loader.reset();
    }

    public processPackets(code: string, data: any): void {
        switch (code) {
            case "WorldData":
                this.world = new World(data.name, data.tilemap, this.loader);
                this.world.load();
                break;
            case "LocalCharacterState":
                const dataCharacters = data.characters;
                const dataCharacterIDs = [];
                for (const dataCharacter of dataCharacters) {
                    const dataCharacterLocation = dataCharacter.location;
                    dataCharacterIDs.push(dataCharacter.player_id);

                    if (this.localCharacters.has(dataCharacter.player_id)) {
                        const character = this.localCharacters.get(dataCharacter.player_id);
                        character.location = new Location(dataCharacterLocation.x, dataCharacterLocation.y, this.world);

                        this.localCharacters.set(character.playerID, character);
                    } else {
                        const character = new Character(dataCharacter.player_id, dataCharacter.id);
                        character.location = new Location(dataCharacterLocation.x, dataCharacterLocation.y, this.world);
                        this.localCharacters.set(character.playerID, character);
                    }
                }

                for (const pid of this.localCharacters.keys()) {
                    if (!dataCharacterIDs.includes(pid)) {
                        const character = this.localCharacters.get(pid);
                        character.unRender(this);
                        this.localCharacters.delete(character.playerID);
                    }
                }

                this.setLoaded();
                break;
            default:
                console.log(`Unknown packet ${code} for scene ${this.name}`);
                break;
        }
    }

    public update(): void {
        if (this.localCharacters.has(this.playerID) === false) {
            return;
        }

        const myCharacter = this.localCharacters.get(this.playerID);
        const myCharacterLocation = myCharacter.location;
        const myCharacterWorld = myCharacterLocation.world;

        if (this.movement.isMoving()) {
            this.socket.send(JSON.stringify({
                code: "CharacterMove",
                data: {
                    down: this.movement.down,
                    left: this.movement.left,
                    right: this.movement.right,
                    up: this.movement.up,
                },
            }));

            // We are "predicting" the local character location in case there is lag
            // this isn't perfect but it is better than nothing
            let x = myCharacterLocation.x;
            let y = myCharacterLocation.y;
            if (this.movement.left) {
                x = x - 1;
            }
            if (this.movement.right) {
                x = x + 1;
            }
            if (this.movement.up) {
                y = y - 1;
            }
            if (this.movement.down) {
                y = y + 1;
            }

            if (x < 0) {
                x = 0;
            }
            if (y < 0) {
                y = 0;
            }

            if (x > myCharacterWorld.tilemap.width) {
                x = myCharacterWorld.tilemap.width;
            }
            if (y > myCharacterWorld.tilemap.height) {
                y = myCharacterWorld.tilemap.height;
            }

            myCharacter.location = new Location(x, y, myCharacterWorld);
            this.localCharacters.set(myCharacter.playerID, myCharacter);
        }
    }

    public render(screenWidth: number, screenHeight: number): void {
        if (this.localCharacters.has(this.playerID) === false) {
            return;
        }

        if (this.camera === undefined) {
            this.camera = new Camera(screenWidth, screenHeight);
        }

        const myCharacter = this.localCharacters.get(this.playerID);
        const myCharacterLocation = myCharacter.location;
        const myCharacterWorld = myCharacterLocation.world;
        this.camera.update(myCharacterLocation); // constantly update the camera location

        // render the world at the player location
        if (this.renderedWorld !== myCharacterWorld) {
            if (this.renderedWorld != null) {
                this.renderedWorld.unRender();
            }
            this.renderedWorld = myCharacterWorld;
        }
        myCharacterWorld.render(this, myCharacterLocation, this.camera);

        // TODO: render ground items here

        for (const pid of this.localCharacters.keys()) {
            if (pid !== this.playerID) {
                const player = this.localCharacters.get(pid);
                player.render(this, myCharacterLocation, this.camera);
            }
        }
        // render self last so we stay on top
        myCharacter.render(this, myCharacterLocation, this.camera);
    }

    protected setup(): void {
        this.movement = new Movement();
        this.setupGameKeyboard();
        this.socket.send(JSON.stringify({
            code: "DoneLoading",
            data: {
                what: this.name,
            },
        }));
    }

    private setupGameKeyboard() { // This will get giant when we add more keybinds so we may want to change this
        // don't send packets here directly
        // just set variables to do that thing
        // i.e movement or clicking a button, ect..
        // this prevents sending a shit ton of packets

        // movement keys
        const keyLeft = new Keyboard("ArrowLeft");
        const keyUp = new Keyboard("ArrowUp");
        const keyRight = new Keyboard("ArrowRight");
        const keyDown = new Keyboard("ArrowDown");
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
}
