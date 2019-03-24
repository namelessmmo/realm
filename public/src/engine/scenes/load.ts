import { Interface } from "../interface";
import { Scene } from "../scene";
import { CharacterSelection } from "./character_selection";

export class Load extends Scene {

    private loadInterface: Interface;

    public constructor() {
        super("load");
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

    public setMessage(code: number, message: string) {
        this.loadInterface.data = {code, message};
    }

    public update(): void {
        this.loadInterface.update();
    }

    public render(screenWidth: number, screenHeight: number): void {
        // TODO: loading backgrounds?
        this.loadInterface.render();
    }

    public processPackets(code: string, data: any) {
        switch (code) {
            case "PlayerInfo":
                const playerID = data.player_id;
                console.log("My Player ID ", playerID);
                this.sceneManager.loadScene.setMessage(0, "Loading characters...");
                this.sceneManager.setScene(new CharacterSelection(playerID));
                break;
            default:
                console.log(`Unknown packet ${code} for scene ${this.name}`);
                break;
        }
    }

    protected setup(): void {
        this.loadInterface = this.interfaceMananger.getInterface(1);
        this.loadInterface.data = {code: 0, message: "Loading..."};
        this.setLoaded();
    }

}
