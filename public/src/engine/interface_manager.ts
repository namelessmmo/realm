import * as PIXI from "pixi.js";
import { Interface } from "./interface";
import { Scene } from "./scene";

export class InterfaceManager {
    private interfaces: Map<number, Interface>;
    private readonly scene: Scene;

    public constructor(scene: Scene) {
        this.scene = scene;
        this.interfaces = new Map();
    }

    public getInterface(id: number): Interface {
        return this.interfaces.get(id);
    }

    public setupInterfaces(loader: PIXI.loaders.Loader) {
        for (const resourceKey of Object.keys(loader.resources)) {
            if (resourceKey.startsWith("interface/")) {
                const interfaceResource = loader.resources[resourceKey].data;
                const interf = Interface.Parse(interfaceResource, this.scene);
                this.interfaces.set(interf.id, interf);
            }
        }
        return;
    }

}
