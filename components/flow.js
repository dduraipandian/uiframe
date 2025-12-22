import { EmitterComponent } from "./base.js";
import Utility from "./utils.js";


class DragHandler {
    constructor(element, onMoveHandler, initialPosition = { x: 0, y: 0 }, startDragPosition = { x: 0, y: 0 }) {
        this.element = element;
        this.onMoveHandler = onMoveHandler;

        this.isDragging = false;
        this.dragStartPosition = startDragPosition;
        this.initialPosition = initialPosition;

        this.elementX = this.initialPosition.x;
        this.elementY = this.initialPosition.y;

        this.rafId = null;

        this.MOUSE_RIGHT_CLICK = 2;
    }

    destroy() {
        this.element.removeEventListener("mousedown", this.onHold.bind(this));
        this.element.removeEventListener("mousemove", this.onMove.bind(this));
        this.element.removeEventListener("mouseup", this.onRelease.bind(this));
    }

    registerDragEvent() {
        // Canvas Panning Listeners for click and drag, draggable will not work 
        // as it will go to initial position when click is released
        this.element.addEventListener("mousedown", this.onHold.bind(this));
    }

    onHold(e) {
        if (e.button === this.MOUSE_RIGHT_CLICK) {
            console.log("FLOW: Ignoreing Right click on ", this.element);
            return
        }

        e.stopPropagation();
        this.isDragging = true;
        this.dragStartPosition = { x: e.clientX, y: e.clientY };
        this.initialPosition = { x: this.elementX, y: this.elementY };
        this.element.style.cursor = "grabbing";
        console.log("FLOW: Left click on", this.element);

        document.addEventListener("mousemove", this.onMove.bind(this));
        document.addEventListener("mouseup", this.onRelease.bind(this));

        this.startRaf();
    }

    onMove(e) {
        if (e.button === this.MOUSE_RIGHT_CLICK) {
            console.log("FLOW: Ignoreing Right click on", this.element);
            return
        }

        if (!this.isDragging) {
            return;
        }

        console.log("FLOW: mouse move on ", this.element);
        const dx = e.clientX - this.dragStartPosition.x;
        const dy = e.clientY - this.dragStartPosition.y;

        this.elementX = this.initialPosition.x + dx;
        this.elementY = this.initialPosition.y + dy;
    }

    onRelease(e) {
        if (e.button === this.MOUSE_RIGHT_CLICK) {
            console.log("FLOW: Ignoreing right click on", this.element);
            return
        }

        e.stopPropagation();
        this.isDragging = false;
        this.element.style.cursor = "grab";
        document.removeEventListener("mousemove", this.onMove.bind(this));
        document.removeEventListener("mouseup", this.onRelease.bind(this));
        console.log("FLOW: mouseup on ", this.element);
    }

    static register(element, onMoveHandler) {
        const dragHandler = new DragHandler(element, onMoveHandler);
        dragHandler.registerDragEvent();
        return dragHandler
    }

    startRaf() {
        if (this.rafId) return;

        const loop = () => {
            if (!this.isDragging) {
                this.rafId = null;
                return;
            }

            // DOM update happens ONLY here
            this.onMoveHandler(this.elementX, this.elementY);
            this.rafId = requestAnimationFrame(loop);
        };

        this.rafId = requestAnimationFrame(loop);
    }
}

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

        this.isDraggingCanvas = false;
        this.isDraggingNode = false;
        this.initialCanvasPosition = { x: this.canvasX, y: this.canvasY };
        this.canvasDragStartPosition = { x: 0, y: 0 }; // Mouse position at start of drag 

        this.nodes = {}; // { id: { id, x, y, inputs, outputs, data, el } }
        this.connections = []; // [ { outputNodeId, outputPort, inputNodeId, inputPort } ]
        this.nodeIdCounter = 1;

        // DOM References
        this.canvasEl = null;
        this.svgEl = null;

        this.MOUSE_RIGHT_CLICK = 2;
        this.gridFactor = 24;
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

        // canvas container drag handler
        DragHandler.register(this.containerEl, this.redrawCanvasWithXY.bind(this));

        // passive: false to allow preventDefault to be called. It is false by default except for Safari.
        this.containerEl.addEventListener("wheel", this.onCanvasWheelZoom.bind(this), { passive: false });
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

        const nodeEl = el.querySelector(`#node-${node.id}`);

        nodeEl.onclick = (e) => this.onNodeClick(e, node.id);

        // nodeEl.onmousedown = (e) => this.onNodeMouseDown(e, node.id);
        // nodeEl.onmousemove = (e) => this.onNodeMouseMove(e, node.id);
        // nodeEl.onmouseup = (e) => this.onNodeMouseUp(e, node.id);

        const hl = new DragHandler(nodeEl,
            this.redrawNodeWithXY.bind(this, node.id),
            { x: this.nodes[node.id].x, y: this.nodes[node.id].y }
        );
        hl.registerDragEvent();

        nodeEl.querySelectorAll(".flow-port").forEach((port) => {
            port.onmousedown = (e) => this.onPortMouseDown(e, node.id, port.dataset.type, port.dataset.index);
        });

        this.nodes[node.id].el = nodeEl;
        this.canvasEl.appendChild(nodeEl);
    }

    // handling mouse left click on port in the node    
    onCanvasWheelZoom(e) {
        e.preventDefault();
        console.log("FLOW: Wheel on canvas with deltaY: ", e.deltaY);

        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        const newZoom = Math.max(0.1, Math.min(this.zoom + delta, 3));
        this.zoom = newZoom;
        this.redrawCanvas();
    }

    onPortMouseDown(e, nodeId, type, index) {
        if (e.button === this.MOUSE_RIGHT_CLICK) {
            console.log("FLOW: Ignoreing Right click on port", nodeId, type, index);
            return
        }

        e.stopPropagation();
        if (type === "output") {
            this.isConnecting = true;
            this.connectionStart = { nodeId, index };
        }
    }

    // handling mouse left click on node
    onNodeClick(e, id) {
        this.canvasEl.querySelectorAll(".flow-node").forEach(n => n.classList.remove("selected"));
        this.nodes[id].el.classList.add("selected");
    }

    onNodeMouseDown(e, id) {
        if (e.button === this.MOUSE_RIGHT_CLICK) {
            console.log("FLOW: Ignoreing Right click on node", id);
            return
        }

        e.stopPropagation(); // Don't trigger canvas drag
        e.preventDefault(); // Prevent text selection/native drag

        this.isDraggingNode = true;
        this.dragNodeParams = { id, startX: e.clientX, startY: e.clientY };
        this.initialNodePos = { x: this.nodes[id].x, y: this.nodes[id].y };

        // Select node styling
        // de-select all other nodes except the current one
        this.nodes[id].el.style.cursor = "grabbing";
        console.log(this.nodes[id].el.classList);
    }

    onNodeMouseMove(e, id) {
        if (e.button === this.MOUSE_RIGHT_CLICK) {
            console.log("FLOW: Ignoreing Right click on", this.element);
            return
        }

        e.stopPropagation(); // Don't trigger canvas drag
        e.preventDefault(); // Prevent text selection/native drag

        if (this.isDraggingCanvas) {
            const dx = e.clientX - this.dragStart.x;
            const dy = e.clientY - this.dragStart.y;
            this.canvasX = this.initialCanvas.x + dx;
            this.canvasY = this.initialCanvas.y + dy;
            this.updateCanvasTransform();
        }
        else if (this.isDraggingNode) {
            const dx = (e.clientX - this.dragNodeParams.startX);
            const dy = (e.clientY - this.dragNodeParams.startY);
            const node = this.nodes[this.dragNodeParams.id];
            node.x = this.initialNodePos.x + dx;
            node.y = this.initialNodePos.y + dy;
            node.el.style.transform = `translate(${node.x}px, ${node.y}px)`;

            // this.updateConnections(node.id); // Re-draw lines connected to this node
        }
        else if (this.isConnecting) {
            // Draw temp line to mouse
            this.renderTempConnection(e);
        }
    }

    onNodeMouseUp(e, id) {
        if (e.button === this.MOUSE_RIGHT_CLICK) {
            console.log("FLOW: Ignoreing Right click on", this.element);
            return
        }

        e.stopPropagation(); // Don't trigger canvas drag
        e.preventDefault(); // Prevent text selection/native drag

        this.isDraggingCanvas = false;
        this.isDraggingNode = false;
        this.canvasEl.style.pointerEvents = "all"; // Re-enable pointer events
        // Reset drag params
        this.dragNodeParams = null;
        this.nodes[id].el.style.cursor = "grab";
    }

    redrawCanvas() {
        this.redrawCanvasWithXY(this.canvasX, this.canvasY)
    }

    redrawCanvasWithXY(x, y) {
        this.canvasX = x;
        this.canvasY = y;

        this.canvasEl.style.transform = `translate(${x}px, ${y}px) scale(${this.zoom})`;

        // updating grid size (dot dots)
        const gridSize = this.gridFactor * this.zoom;
        this.containerEl.style.backgroundSize = `${gridSize}px ${gridSize}px`;
        this.containerEl.style.backgroundPosition = `${x}px ${y}px`;

        this.containerEl.style.backgroundImage = `radial-gradient(#d2d2d7 ${1.5 * this.zoom}px, transparent ${1.5 * this.zoom}px)`;
    }

    redrawNodeWithXY(id, x, y) {
        this.nodes[id].el.style.transform = `translate(${x}px, ${y}px)`;
        // this.updateConnections(node.id); // Re-draw lines connected to this node
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

        const portEl = nodeEl.querySelector(`.flow-port[data-type="${type}"][data-index="${index}"]`);
        if (!portEl) return { x: node.x, y: node.y };

        // Temporarily need rects to calculate static offset
        let portRect = portEl.getBoundingClientRect();
        let nodeRect = nodeEl.getBoundingClientRect();

        // The offset of the port center RELATIVE to the node top-left (unscaled by zoom)
        // We need to divide by zoom here because getBoundingClientRect includes the zoom transform
        const offsetX = (portRect.left - nodeRect.left + portRect.width / 2) / this.zoom;
        const offsetY = (portRect.top - nodeRect.top + portRect.height / 2) / this.zoom;

        // Return purely logic-based position: Node current X/Y + Static Offset
        return {
            x: node.x + offsetX,
            y: node.y + offsetY
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
