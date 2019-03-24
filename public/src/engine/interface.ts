import * as Handlebars from "handlebars/dist/cjs/handlebars";
import * as $ from "jquery";
import { Scene } from "./scene";

export class Interface {

    public static Parse(data: any, scene: Scene): Interface {
        const template = Handlebars.compile(data);

        const output = template({});
        const htmlOut = $("<output>").append($.parseHTML(output));
        const interfaceID = +htmlOut.children()[0].attributes.getNamedItem("id").nodeValue.slice("interface-".length);

        return new Interface(interfaceID, template, scene);
    }

    public readonly id: number;

    public data: any;
    private oldData: any;

    private readonly template: any;
    private readonly scene: Scene;

    private currentHTML: string;
    private newHTML: string;

    private clickedButtonID: number;

    public constructor(id: number, template: any, scene: Scene) {
        this.id = id;
        this.template = template;
        this.scene = scene;

        this.data = {};

        this.clickedButtonID = -1;
    }

    public update() {

        // When data changes re-execute the template
        if (this.data !== this.oldData) {
            this.newHTML = this.template(this.data);
            this.oldData = this.data;
        }

        if (this.clickedButtonID !== -1) {
            const clickedButtonData = JSON.stringify({
                code: "InterfaceButtonClick",
                data: {
                    button_id: this.clickedButtonID,
                    interface_id: this.id,
                },
            });
            this.scene.getSocket().send(clickedButtonData);

            this.clickedButtonID = -1;
        }
    }

    public render(): boolean {

        // Only render the interface when something has changed
        if (this.newHTML !== this.currentHTML) {
            const jInterface = $("#interface-" + this.id);
            if (jInterface.length === 0) {
                $("#interfaces").append(this.newHTML);
            } else {
                jInterface.replaceWith(this.newHTML);
            }
            this.setupButtons();
            this.currentHTML = this.newHTML;
            return true;
        }

        return false;
    }

    private setupButtons() {
        const jButtons = $("*[data-button-id]").toArray();
        for (const b of jButtons) {
            const jButton = $(b);
            jButton.off("click"); // remove any existing click handlers

            // set a click handler
            jButton.on("click", (event) => {
                const buttonID = +jButton.attr("data-button-id");

                // Prevent button spamming
                if (this.clickedButtonID === -1) {
                    this.clickedButtonID = buttonID;
                }
            });
        }
    }

}
