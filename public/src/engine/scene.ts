import * as PIXI from "pixi.js";
import { InterfaceManager } from "./interface_manager";
import { SceneManager } from "./scene_manager";

export abstract class Scene extends PIXI.Container {

    protected loader: PIXI.loaders.Loader;

    protected readonly interfaceMananger: InterfaceManager;

    protected manifest: Map<string, string>;

    protected sceneManager: SceneManager;

    protected socket: WebSocket;

    private loading: boolean;
    private loaded: boolean;

    public constructor(name: string) {
        super();
        this.name = name;
        this.loader = new PIXI.loaders.Loader();
        this.interfaceMananger = new InterfaceManager(this);
        this.manifest = new Map();

        this.loading = false;
        this.loaded = false;
    }

    public setSocket(socket: WebSocket) {
        this.socket = socket;
    }

    public getSocket(): WebSocket {
        return this.socket;
    }

    public setSceneManager(manager: SceneManager) {
        this.sceneManager = manager;
    }

    public isLoading(): boolean {
        return this.loading;
    }

    public isLoaded(): boolean {
        return this.loaded;
    }

    public load(cb: () => void) {
        const globalLoader = PIXI.loader;
        if (this.loaded) {
            if (cb !== null) {
                cb();
            }
            return;
        }

        this.loading = true;

        const manifest = globalLoader.resources.manifest.data;

        for (const key of Object.keys(manifest)) {
            const prefix = `scenes/${this.name}/`;
            if (key.startsWith(prefix)) {
                this.manifest.set(key.slice(prefix.length), manifest[key]);
            }
        }

        this._load(() => {
            this.interfaceMananger.setupInterfaces(this.loader);
            this.setup();
            if (cb !== null) {
                cb();
            }
        });
    }

    public unload() {
        this.loaded = false;

        // TODO: empty loader and destroy all assets

        // remove all children
        while (this.children[0]) {
            this.removeChild(this.children[0]);
        }

        this._unload();
    }

    public abstract _load(cb: () => void): void;

    public abstract _unload(): void;

    public abstract processPackets(code: string, data: any): void;

    public abstract update(): void;

    public abstract render(screenWidth: number, screenHeight: number): void;

    protected abstract setup(): void;

    protected setLoaded() {
        this.loaded = true;
        this.loading = false;
    }

}
