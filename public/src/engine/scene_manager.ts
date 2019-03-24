import * as $ from "jquery";
import * as PIXI from "pixi.js";
import { Scene } from "./scene";
import { Load } from "./scenes/load";

export class SceneManager {

    public socket: WebSocket;
    public readonly loadScene: Load;
    private readonly stage: PIXI.Container;

    private currentScene: Scene;

    public constructor(stage: PIXI.Container) {
        this.currentScene = null;
        this.stage = stage;

        // The load scene is special and is only shown
        // as an inbetween different scenes
        this.loadScene = new Load();
        this.loadScene.setSceneManager(this);
    }

    public loadManager(cb: () => void) {
        this.loadScene.load(cb);
    }

    public setScene(scene: Scene) {
        if (this.currentScene !== null) {
            const oldScene = this.currentScene;
            this.currentScene = null;
            if (oldScene.parent !== null) {
                oldScene.parent.removeChild(this.currentScene);
            }
            oldScene.unload();

        }
        if (scene !== null) {
            scene.setSceneManager(this);
            scene.setSocket(this.socket);
        }
        this.currentScene = scene;
    }

    public update() {
        if (this.currentScene === null) {
            this.loadScene.update();
            return;
        }

        if (this.currentScene.isLoaded() === false) {
            this.loadScene.update();

            if (this.currentScene.isLoading() === false) {
                this.currentScene.load(null);
            }
            return;
        }

        this.currentScene.update();
    }

    public render(screenWidth: number, screenHeight: number) {
        if (this.currentScene === null) {
            try {
                // see if the load scene is a child
                this.stage.getChildIndex(this.loadScene);
            } catch (e) {
                // if it isn't add it
                $("#interfaces").empty(); // remove all interfaces from previous scene
                this.stage.addChild(this.loadScene);
            }
            this.loadScene.render(screenWidth, screenHeight);
            return;
        }

        if (this.currentScene.isLoaded() === false) {
            try {
                // see if the load scene is a child
                this.stage.getChildIndex(this.loadScene);
            } catch (e) {
                // if it isn't add it
                $("#interfaces").empty(); // remove all interfaces from previous scene
                this.stage.addChild(this.loadScene);
            }
            this.loadScene.render(screenWidth, screenHeight);
            return;
        }

        if (this.loadScene.parent !== null) {
            // remove the load scene because we are done loading
            this.stage.removeChild(this.loadScene);
        }

        try {
            // see if the current scene is a child
            this.stage.getChildIndex(this.currentScene);
        } catch (e) {
            // if it isn't add it
            $("#interfaces").empty(); // remove all interfaces from previous scene
            this.stage.addChild(this.currentScene);
        }
        this.currentScene.render(screenWidth, screenHeight);
    }

    public processPackets(code: string, data: any) {
        if (this.currentScene === null) {
            this.loadScene.processPackets(code, data);
            return;
        }

        this.currentScene.processPackets(code, data);
    }
}
