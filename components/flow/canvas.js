import { EmitterComponent } from "../base.js";
import DragHandler from "./utils.js";
import FlowNodeManager from "./node.js";

/**
 * Manages the state and logical operations of a Flow.
 * Adheres to SRP by only handling data and logical transformations.
 */
class FlowCanvas extends EmitterComponent {
    constructor({ name, options = {} }) {
        super({ name });

        this.options = options;
        this.zoom = options.zoom || 1;
        this.enableZoomActions = options.enable_zoom_actions || true;
        this.originalZoom = this.zoom;
        this.canvasX = options.canvas?.x || 0;
        this.canvasY = options.canvas?.y || 0;

        this.canvasId = this.id + "-canvas";
        this.containerId = this.id + "-flow-container";
        this.zoomActionsId = this.id + "-zoom-actions";
        // this.nodeManager = new FlowNodeManager({ name: this.name + "-flow-node-manager", canvasId: this.canvasId, options });
    }

    html() {
        return `
            <div id="${this.canvasId}" 
                class="flow-canvas" 
                style="transform: translate(${this.canvasX}px, ${this.canvasY}px) scale(${this.zoom})">
                <svg id="${this.id}-svg" class="flow-connections"></svg>
            </div>
            ${this.enableZoomActions ? `<div id="${this.zoomActionsId}" class="zoom-actions"></div>` : ""}
        `;
    }

    init() {
        this.canvasEl = this.container.querySelector(`#${this.canvasId}`);
        this.svgEl = this.container.querySelector(`#${this.id}-svg`);
        this.container = this.canvasEl;

        // canvas container drag handler
        DragHandler.register(this.parentContainer, this.redrawCanvasWithXY.bind(this));

        // passive: false to allow preventDefault to be called. It is false by default except for Safari.
        if (this.enableZoomActions) {
            this.containerEl.addEventListener("wheel", this.onCanvasWheelZoom.bind(this), {
                passive: false,
            });
        }

        // Drop listener for adding new nodes from outside
        this.containerEl.addEventListener("dragover", (e) => e.preventDefault());
        this.containerEl.addEventListener("drop", this.onDrop.bind(this));

        // this.zoomInEl = this.containerEl.querySelector(`#${this.id}-zoomin`);
        // this.zoomOutEl = this.containerEl.querySelector(`#${this.id}-zoomout`);
        // this.zoomResetEl = this.containerEl.querySelector(`#${this.id}-zoomreset`);
        // this.zoomInEl.addEventListener("click", this.onZoomAction.bind(this));
        // this.zoomOutEl.addEventListener("click", this.onZoomAction.bind(this));
        // this.zoomResetEl.addEventListener("click", this.onZoomAction.bind(this));
    }

    redrawCanvas() {
        this.redrawCanvasWithXY(this.canvasX, this.canvasY);
    }

    redrawCanvasWithXY(x, y) {
        this.canvasX = x;
        this.canvasY = y;

        this.canvasEl.style.transform = `translate(${x}px, ${y}px) scale(${this.zoom})`;

        // updating grid size (dot dots)
        const gridSize = this.gridFactor * this.zoom;
        this.containerEl.style.backgroundSize = `${gridSize}px ${gridSize}px`;
        this.containerEl.style.backgroundPosition = `${x}px ${y}px`;

        this.containerEl.style.backgroundImage = `radial-gradient(#c1c1c4 ${1.5 * this.zoom}px, transparent ${1.5 * this.zoom}px)`;
        // this.zoomChangeUpdate();        
    }

    // handling mouse left click on port in the node
    onCanvasWheelZoom(e) {
        e.preventDefault();
        console.log("FLOW: Wheel on canvas with deltaY: ", e.deltaY);

        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        const newZoom = Math.max(0.1, Math.min(this.zoom + delta, 3));
        this.zoom = newZoom;
        // this.redrawCanvas();
        this.emit("canvas:zoom", { data: { zoom: this.zoom, x: this.canvasX, y: this.canvasY, delta: delta, originalZoom: this.originalZoom } });
    }

    onDrop(e) {
        e.preventDefault();
        e.stopPropagation();

        try {
            const raw = e.dataTransfer.getData("application/json");
            if (!raw) return;

            const data = JSON.parse(raw);
            const rect = this.containerEl.getBoundingClientRect();
            const x = (e.clientX - rect.left - this.canvasX - this.nodeWidth / 2) / this.zoom;
            const y = (e.clientY - rect.top - this.canvasY - this.nodeHeight / 2) / this.zoom;

            // this.addNode({
            //     name: data.name,
            //     inputs: data.inputs,
            //     outputs: data.outputs,
            //     x,
            //     y,
            //     html: data.html,
            // });
            console.debug("FLOW - DROP: ", data, x, y);
        } catch (err) {
            console.error("Invalid drop data", err);
        }
    }
}

export default FlowCanvas;