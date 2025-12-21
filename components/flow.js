import { EmitterComponent } from "./base.js";
import Utility from "./utils.js";

/**
 * A lightweight Flow/Node editor component inspired by Drawflow, and freeform.
 * features: zoom, pan, draggable nodes, input/output ports, bezier connections.
 * @extends EmitterComponent
 */
class Flow extends EmitterComponent {
    /**
     * @param {Object} options
     * @param {string} options.name - Unique name for the flow instance.
     * @param {Object} [options.options] - Configuration options.
     * @param {number} [options.options.zoom=1] - Initial zoom level.
     * @param {Object} [options.options.canvas={x:0, y:0}] - Initial pan position.
     */
    constructor({ name, options = {} }) {
        super({ name });

        this.options = options;
        this.zoom = options.zoom || 1;
        this.canvasX = options.canvas?.x || 0;
        this.canvasY = options.canvas?.y || 0;

        this.nodes = {}; // { id: { id, x, y, inputs, outputs, data, el } }
        this.connections = []; // [ { outputNodeId, outputPort, inputNodeId, inputPort } ]
        this.nodeIdCounter = 1;

        // DOM References
        this.canvasEl = null;
        this.svgEl = null;
    }

    /**
     * Returns component HTML structure.
     */
    html() {
        return `
            <div id="${this.id}-flow-container" class="flow-container">
                <div id="${this.id}-canvas" 
                    class="flow-canvas" 
                    style="transform: translate(${this.canvasX}px, ${this.canvasY}px) scale(${this.zoom})">
                <svg id="${this.id}-svg" class="flow-connections"></svg>
                </div>
            </div>
        `;
    }

    init() {
        this.containerEl = this.container.querySelector(`#${this.id}-flow-container`);
        this.canvasEl = this.container.querySelector(`#${this.id}-canvas`);
        this.svgEl = this.container.querySelector(`#${this.id}-svg`);
    }

    /**
     * Add a new node to the flow.
     * @param {Object} params
     * @param {string} params.name - Title of node.
     * @param {number} params.inputs - Number of input ports.
     * @param {number} params.outputs - Number of output ports.
     * @param {number} params.x - X position.
     * @param {number} params.y - Y position.
     * @param {string} params.html - Inner HTML content.
     * @returns {number} The new node ID.
     */
    addNode({ name, inputs = 1, outputs = 1, x = 0, y = 0, html = "" }) {
        const id = this.nodeIdCounter++;
        const node = { id, name, inputs, outputs, x, y, html };

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
            class="flow-node" 
            style="transform: translate(${node.x}px, ${node.y}px)">
            <div class="flow-ports-column flow-ports-in">
                ${Array.from({ length: node.inputs }, (_, i) => inputHtml.replace("{{index}}", i)).join("\n")}
            </div>
            <div class="flow-node-content">
                <div class="flow-node-header">${node.name}</div>
                <div class="flow-node-body">${node.html}</div>
            </div>
            <div class="flow-ports-column flow-ports-out">
                ${Array.from({ length: node.outputs }, (_, i) => outputHtml.replace("{{index}}", i)).join("\n")}
            </div>
        </div>
        `;
        el.innerHTML = nodeHtml;
        el.querySelectorAll(".flow-port").forEach((port) => {
            port.onmousedown = (e) => this.onPortMouseDown(e, node.id, port.dataset.type, port.dataset.index);
        });
        el.onmousedown = (e) => this.onNodeMouseDown(e, node.id);

        this.nodes[node.id].el = el;
        this.canvasEl.appendChild(el);
    }

    onPortMouseDown(e, nodeId, type, index) {
        e.stopPropagation();
        if (type === "output") {
            this.isConnecting = true;
            this.connectionStart = { nodeId, index };

            // Clear cache for source node to ensure accurate start point
            if (this.nodes[nodeId]) this.nodes[nodeId].portsCache = null;
        }
    }

    onNodeMouseDown(e, id) {
        e.stopPropagation(); // Don't trigger canvas drag
        e.preventDefault(); // Prevent text selection/native drag

        this.isDraggingNode = true;
        this.dragNodeParams = { id, startX: e.clientX, startY: e.clientY };
        this.initialNodePos = { x: this.nodes[id].x, y: this.nodes[id].y };

        // Clear cache to ensure fresh calc on move
        this.nodes[id].portsCache = null;

        // Select node styling
        // de-select all other nodes except the current one
        this.canvasEl.querySelectorAll(".flow-node").forEach(n => n.classList.remove("selected"));
        this.nodes[id].el.classList.add("selected");
    }

    addConnection(outNodeId, outPort, inNodeId, inPort) {
        const outId = parseInt(outNodeId);
        const inId = parseInt(inNodeId);
        const oPort = parseInt(outPort);
        const iPort = parseInt(inPort);

        const exists = this.connections.some(c =>
            c.outNodeId === outId && c.outPort === oPort &&
            c.inNodeId === inId && c.inPort === iPort
        );
        if (exists) return;

        const connection = { outNodeId: outId, outPort: oPort, inNodeId: inId, inPort: iPort };
        this.connections.push(connection);

        // This is important to ensure that the connection is created after the node is rendered 
        // when it is added programmatically, not from the drawing
        const node = this.canvasEl.querySelector(`#node-${outId}`);
        Utility.observe(node, () => this.createConnectionPath(connection));
    }

    createConnectionPath(conn) {
        const p1 = this.getPortPosition(conn.outNodeId, "output", conn.outPort);
        const p2 = this.getPortPosition(conn.inNodeId, "input", conn.inPort);

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const d = this.getBazierPath(p1.x, p1.y, p2.x, p2.y);
        path.setAttribute("d", d);
        path.setAttribute("class", "flow-connection-path");
        path.dataset.id = `${conn.outNodeId}:${conn.outPort}-${conn.inNodeId}:${conn.inPort}`;

        path.onclick = (e) => {
            e.stopPropagation();
            this.connections = this.connections.filter(c => c !== conn);
            path.remove();
        };

        this.svgEl.appendChild(path);
    }

    getPortPosition(nodeId, type, index) {
        const node = this.nodes[nodeId];
        const nodeEl = this.canvasEl.querySelector(`#node-${nodeId}`);

        if (!node || !nodeEl) return { x: 0, y: 0 };

        // CACHE OFFSET: Check if we already calculated the ports relative position
        // This avoids layout trashing during drag
        if (!node.portsCache) node.portsCache = {};
        const cacheKey = `${type}-${index}`;

        if (!node.portsCache[cacheKey]) {
            const portEl = nodeEl.querySelector(`.flow-port[data-type="${type}"][data-index="${index}"]`);
            if (!portEl) return { x: node.x, y: node.y };

            // Temporarily need rects to calculate static offset
            let portRect = portEl.getBoundingClientRect();
            let nodeRect = nodeEl.getBoundingClientRect();

            console.log("port rect: ", portEl, portRect);
            console.log("node rect: ", nodeEl, nodeRect);

            // The offset of the port center RELATIVE to the node top-left (unscaled by zoom)
            // We need to divide by zoom here because getBoundingClientRect includes the zoom transform
            const offsetX = (portRect.left - nodeRect.left + portRect.width / 2) / this.zoom;
            const offsetY = (portRect.top - nodeRect.top + portRect.height / 2) / this.zoom;

            node.portsCache[cacheKey] = { x: offsetX, y: offsetY };
        }

        // Return purely logic-based position: Node current X/Y + Static Offset
        return {
            x: node.x + node.portsCache[cacheKey].x,
            y: node.y + node.portsCache[cacheKey].y
        };
    }

    getBazierPath(x1, y1, x2, y2) {
        const curvature = 0.5;
        const hx1 = x1 + Math.abs(x2 - x1) * curvature;
        const hx2 = x2 - Math.abs(x2 - x1) * curvature;

        return `M ${x1} ${y1} C ${hx1} ${y1} ${hx2} ${y2} ${x2} ${y2}`;
    }
}

export default Flow;
