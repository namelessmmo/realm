import { Interface } from "../interface";
import { Scene } from "../scene";
import { Play } from "./play";

export class CharacterSelection extends Scene {
    private readonly playerID: number;
    private readonly characters: any[];
    private selectionInterface: Interface;

    public constructor(playerID: number) {
        super("character_selection");

        this.playerID = playerID;
        this.characters = [];
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

    public update(): void {
        this.selectionInterface.update();
    }

    public render(screenWidth: number, screenHeight: number): void {
        if (this.selectionInterface.render()) {
            return;
        }
    }

    public processPackets(code: string, data: any) {
        switch (code) {
            case "PlayerCharacters":
                for (let i = 0; i < data.characters.length; i++) {
                    if (data.characters[i] == null) {
                        this.characters[i] = null;
                        continue;
                    }
                    this.characters[i] = {characterID: data.characters[i].id};
                }
                if (this.selectionInterface !== undefined) {
                    this.selectionInterface.data = {characters: this.characters};
                }
                break;
            case "CharacterLoading":
                this.sceneManager.loadScene.setMessage(0, "Loading Game...");
                this.sceneManager.setScene(new Play(this.playerID));
                break;
            default:
                console.log(`Unknown packet ${code} for scene ${this.name}`);
                break;
        }
    }

    protected setup(): void {
        this.selectionInterface = this.interfaceMananger.getInterface(2);
        this.selectionInterface.data = {characters: this.characters};
        this.setLoaded();
    }
}
