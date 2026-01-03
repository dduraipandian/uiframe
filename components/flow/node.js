import { EmitterComponent } from "../base.js";
import DragHandler from "./utils.js";
import * as Constant from "./flow/constants.js";

class FlowNode extends EmitterComponent {
    constructor({ nodeId, inputs = 1, outputs = 1, x = 0, y = 0, html = "", options = {} }) {
        super({ name: `node-${nodeId}` });

        this.x = x;
        this.y = y;
        this.nodeId = nodeId;
        this.inputs = inputs;
        this.outputs = outputs;
        this.contentHtml = html;
        this.options = options;
    }
}

class FlowNodeManager extends EmitterComponent {
    constructor({ name, canvasContainer, options = {} }) {
        super({ name: name + "-flow-node-manager" });
        this.options = options;
        this.zoom = options.zoom || 1;
        this.originalZoom = this.zoom;

        this.nodes = {};
        this.nodeIdCounter = 1;
        this.nodeWidth = options.nodeWidth || 200;
        this.nodeHeight = options.nodeHeight || 90;
        this.selectedNodeId = null;
        this.canvasContainer = canvasContainer;
    }

    addNode({ name, inputs = 1, outputs = 1, x = 0, y = 0, html = "" }) {
        const id = this.nodeIdCounter++;
        const node = { id, name, inputs, outputs, x, y, contentHtml: html };

        this.nodes[id] = node;
        this.renderNode(node);
        return id;
    }

    renderNode(node) {
        const el = document.createElement("div");
        const inputHtml = `<div class="flow-port" data-type="input" data-node-id="${node.id}" data-index="{{index}}"></div>`;
        const outputHtml = `<div class="flow-port" data-type="output" data-node-id="${node.id}" data-index="{{index}}"></div>`;

        const nodeHtml = `
        <div id="node-${node.id}" 
            data-id="${node.id}" 
            class="flow-node rounded" 
            style="top: ${node.y}px; left: ${node.x}px; 
                    width: ${this.nodeWidth}px; height: fit-content">                        
            <div class="flow-ports-column flow-ports-in">
                ${Array.from({ length: node.inputs }, (_, i) => inputHtml.replace("{{index}}", i)).join("\n")}
            </div>
            <div class="flow-node-content card w-100">              
              <div class="card-header">${node.name}</div>
              <div class="card-body">${node.contentHtml}</div>              
            </div>            
            <div class="flow-ports-column flow-ports-out">                
                ${Array.from({ length: node.outputs }, (_, i) => outputHtml.replace("{{index}}", i)).join("\n")}
            </div>
            <button type="button" 
                data-id="${node.id}"
                class="btn-danger btn-close node-close border rounded shadow-none m-1" 
                aria-label="Close">
            </button>
        </div>
        `;
        el.innerHTML = nodeHtml;

        const nodeEl = el.querySelector(`#node-${node.id}`);

        // nodeEl.onclick = (e) => this.onNodeClick(e, node.id);
        // nodeEl.onmousedown = (e) => this.onNodeClick(e, node.id);

        // register drap handler
        const hl = new DragHandler(
            nodeEl,
            this.redrawNodeWithXY.bind(this, node.id),
            {
                x: this.nodes[node.id].x,
                y: this.nodes[node.id].y,
            },
            { x: 0, y: 0 },
            () => this.zoom
        );
        hl.registerDragEvent();

        // nodeEl.querySelectorAll(".flow-ports-out .flow-port").forEach((port) => {
        //     port.onmousedown = (e) => this.mouseDownStartConnection(port, node.id, e);
        // });

        // nodeEl.querySelectorAll(".flow-ports-in .flow-port").forEach((port) => {
        //     port.onmouseup = (e) => this.mouseUpCompleteConnection(port, node.id, e);
        // });

        // nodeEl
        //     .querySelector("button.node-close")
        //     .addEventListener("click", (e) => this.removeNode(e, node.id));

        this.nodes[node.id].el = nodeEl;
        this.canvasContainer.appendChild(nodeEl);
    }

    redrawNodeWithXY(id, x, y) {
        this.nodes[id].x = x;
        this.nodes[id].y = y;

        // https://stackoverflow.com/questions/7108941/css-transform-vs-position
        // Changing transform will trigger a redraw in compositor layer only for the animated element
        // (subsequent elements in DOM will not be redrawn). I want DOM to be redraw to make connection attached to the port.
        // so using position top/left to keep the position intact, not for the animation.
        // I spent hours to find this out with trial and error.
        this.nodes[id].el.style.top = `${y}px`;
        this.nodes[id].el.style.left = `${x}px`;

        // this.updateConnections(id);
        this.emit(Constant.NODE_MOVED_EVENT, { id, x, y });
    }
}


export default FlowNodeManager;