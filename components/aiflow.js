import { EmitterComponent } from "./base.js";

/**
 * A lightweight Flow/Node editor component inspired by Drawflow.
 * features: zoom, pan, draggable nodes, input/output ports, bezier connections.
 * @extends EmitterComponent
 */
class AIFlow extends EmitterComponent {
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
        this.dragStart = { x: 0, y: 0 }; // Mouse position at start of drag
        this.dragNodeParams = null; // { id, startX, startY }

        this.isConnecting = false;
        this.connectionStart = null; // { nodeId, portType, portIndex }

        this.nodes = {}; // { id: { id, x, y, inputs, outputs, data, el } }
        this.connections = []; // [ { outputNodeId, outputPort, inputNodeId, inputPort } ]
        this.nodeIdCounter = 1;

        // DOM References
        this.canvasEl = null;
        this.svgEl = null;

        this.createContainer();
    }

    /**
     * Returns component HTML structure.
     */
    html() {
        return `
      <div id="${this.id}-flow-container" class="flow-container">
        <div id="${this.id}-canvas" class="flow-canvas" 
             style="transform: translate(${this.canvasX}px, ${this.canvasY}px) scale(${this.zoom})">
           <svg id="${this.id}-svg" class="flow-connections"></svg>
        </div>
      </div>
    `;
    }

    /**
     * Initialize logic: listeners for pan/zoom/drag
     */
    init() {
        this.containerEl = this.container.querySelector(`#${this.id}-flow-container`);
        this.canvasEl = this.container.querySelector(`#${this.id}-canvas`);
        this.svgEl = this.container.querySelector(`#${this.id}-svg`);

        // Canvas Panning Listeners
        this.containerEl.addEventListener("mousedown", this.onMouseDown.bind(this));
        this.containerEl.addEventListener("wheel", this.onWheel.bind(this), { passive: false });
        window.addEventListener("mousemove", this.onMouseMove.bind(this));
        window.addEventListener("mouseup", this.onMouseUp.bind(this));

        // Drop listener for adding new nodes from outside
        this.containerEl.addEventListener("dragover", (e) => e.preventDefault());
        this.containerEl.addEventListener("drop", this.onDrop.bind(this));

        // Initial render of grid/transform
        this.updateCanvasTransform();
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
        el.classList.add("flow-node");
        el.id = `node-${node.id}`;
        el.style.transform = `translate(${node.x}px, ${node.y}px)`;
        el.dataset.id = node.id;

        // Inputs Column
        const inputsCol = document.createElement("div");
        inputsCol.classList.add("flow-ports-column", "flow-ports-in");
        for (let i = 0; i < node.inputs; i++) {
            const port = document.createElement("div");
            port.classList.add("flow-port");
            port.dataset.type = "input";
            port.dataset.nodeId = node.id;
            port.dataset.index = i;
            port.onmousedown = (e) => this.onPortMouseDown(e, node.id, "input", i);
            inputsCol.appendChild(port);
        }

        // Content
        const content = document.createElement("div");
        content.classList.add("flow-node-content");
        content.innerHTML = `
      <div class="flow-node-header">${node.name}</div>
      <div class="flow-node-body">${node.html}</div>
    `;

        // Outputs Column
        const outputsCol = document.createElement("div");
        outputsCol.classList.add("flow-ports-column", "flow-ports-out");
        for (let i = 0; i < node.outputs; i++) {
            const port = document.createElement("div");
            port.classList.add("flow-port");
            port.dataset.type = "output";
            port.dataset.nodeId = node.id;
            port.dataset.index = i;
            port.onmousedown = (e) => this.onPortMouseDown(e, node.id, "output", i);
            outputsCol.appendChild(port);
        }

        el.appendChild(inputsCol);
        el.appendChild(content);
        el.appendChild(outputsCol);

        // Make whole node draggable
        el.onmousedown = (e) => this.onNodeMouseDown(e, node.id);

        this.nodes[node.id].el = el;
        this.canvasEl.appendChild(el);
    }

    // --- Interaction Handlers ---

    onMouseDown(e) {
        if (e.target.closest(".flow-node") || e.target.closest(".flow-port")) return;
        // Start Panning
        this.isDraggingCanvas = true;
        this.dragStart = { x: e.clientX, y: e.clientY };
        this.initialCanvas = { x: this.canvasX, y: this.canvasY };
        this.containerEl.style.cursor = "grabbing";
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
        this.canvasEl.querySelectorAll(".flow-node").forEach(n => n.classList.remove("selected"));
        this.nodes[id].el.classList.add("selected");
    }

    onPortMouseDown(e, nodeId, type, index) {
        e.stopPropagation();
        if (type === "output") {
            this.isConnecting = true;
            this.connectionStart = { nodeId, index };

            // Clear cache for source node to ensure accurate start point
            if (this.nodes[nodeId]) this.nodes[nodeId].portsCache = null;

            // Create temp line
        }
    }

    onMouseMove(e) {
        if (this.isDraggingCanvas) {
            const dx = e.clientX - this.dragStart.x;
            const dy = e.clientY - this.dragStart.y;
            this.canvasX = this.initialCanvas.x + dx;
            this.canvasY = this.initialCanvas.y + dy;
            this.updateCanvasTransform();
        }
        else if (this.isDraggingNode) {
            const dx = (e.clientX - this.dragNodeParams.startX) / this.zoom;
            const dy = (e.clientY - this.dragNodeParams.startY) / this.zoom;
            const node = this.nodes[this.dragNodeParams.id];
            node.x = this.initialNodePos.x + dx;
            node.y = this.initialNodePos.y + dy;
            node.el.style.transform = `translate(${node.x}px, ${node.y}px)`;

            this.updateConnections(node.id); // Re-draw lines connected to this node
        }
        else if (this.isConnecting) {
            // Draw temp line to mouse
            this.renderTempConnection(e);
        }
    }

    onMouseUp(e) {
        this.isDraggingCanvas = false;
        this.isDraggingNode = false;
        this.containerEl.style.cursor = "grab";
        this.canvasEl.style.pointerEvents = "all"; // Re-enable pointer events

        if (this.isConnecting) {
            // Check if dropped on local input port
            const target = e.target.closest(".flow-port");
            if (target && target.dataset.type === "input") {
                const inputNodeId = parseInt(target.dataset.nodeId);
                const inputIndex = parseInt(target.dataset.index);
                this.addConnection(this.connectionStart.nodeId, this.connectionStart.index, inputNodeId, inputIndex);
            }
            this.isConnecting = false;
            this.clearTempConnection();
        }

        // Reset drag params
        this.dragNodeParams = null;
    }

    onWheel(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        const newZoom = Math.max(0.1, Math.min(this.zoom + delta, 3));
        this.zoom = newZoom;
        this.updateCanvasTransform();
    }

    onDrop(e) {
        e.preventDefault();
        e.stopPropagation();

        // Robust Debounce: Check time since last drop
        const now = Date.now();
        if (this.lastDropTime && (now - this.lastDropTime < 500)) {
            return;
        }
        this.lastDropTime = now;

        try {
            const raw = e.dataTransfer.getData("application/json");
            if (!raw) return;

            const data = JSON.parse(raw);
            const rect = this.containerEl.getBoundingClientRect();
            const x = (e.clientX - rect.left - this.canvasX) / this.zoom;
            const y = (e.clientY - rect.top - this.canvasY) / this.zoom;

            this.addNode({
                name: data.name,
                inputs: data.inputs,
                outputs: data.outputs,
                x, y,
                html: data.html
            });
        } catch (err) {
            console.error("Invalid drop data", err);
        }
    }

    // --- Rendering & Logic ---

    updateCanvasTransform() {
        this.canvasEl.style.transform = `translate(${this.canvasX}px, ${this.canvasY}px) scale(${this.zoom})`;

        const gridSize = 24 * this.zoom;
        this.containerEl.style.backgroundSize = `${gridSize}px ${gridSize}px`;
        this.containerEl.style.backgroundPosition = `${this.canvasX}px ${this.canvasY}px`;

        if (!this.containerEl.style.backgroundImage) {
            this.containerEl.style.backgroundImage = `radial-gradient(#d2d2d7 ${1.5 * this.zoom}px, transparent ${1.5 * this.zoom}px)`;
        } else {
            this.containerEl.style.backgroundImage = `radial-gradient(#d2d2d7 ${1.5 * this.zoom}px, transparent ${1.5 * this.zoom}px)`;
        }
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

        this.connections.push({ outNodeId: outId, outPort: oPort, inNodeId: inId, inPort: iPort });
        this.renderConnections();
    }

    renderConnections() {
        this.svgEl.innerHTML = "";
        this.connections.forEach(conn => {
            this.createConnectionPath(conn);
        });
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

    updateConnections(nodeId) {
        const id = parseInt(nodeId);
        const relevant = this.connections.filter(c => c.outNodeId === id || c.inNodeId === id);

        relevant.forEach(conn => {
            const path = this.svgEl.querySelector(`path[data-id="${conn.outNodeId}:${conn.outPort}-${conn.inNodeId}:${conn.inPort}"]`);
            if (path) {
                const p1 = this.getPortPosition(conn.outNodeId, "output", conn.outPort);
                const p2 = this.getPortPosition(conn.inNodeId, "input", conn.inPort);
                const d = this.getBazierPath(p1.x, p1.y, p2.x, p2.y);
                path.setAttribute("d", d);
            } else {
                this.createConnectionPath(conn);
            }
        });
    }

    renderTempConnection(e) {
        let path = this.svgEl.querySelector(".flow-connection-temp");
        if (!path) {
            path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("class", "flow-connection-path selected flow-connection-temp");
            path.style.pointerEvents = "none";
            this.svgEl.appendChild(path);
        }

        const p1 = this.getPortPosition(this.connectionStart.nodeId, "output", this.connectionStart.index);

        const rect = this.canvasEl.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left) / this.zoom;
        const mouseY = (e.clientY - rect.top) / this.zoom;

        path.setAttribute("d", this.getBazierPath(p1.x, p1.y, mouseX, mouseY));
    }

    clearTempConnection() {
        const path = this.svgEl.querySelector(".flow-connection-temp");
        if (path) path.remove();
    }

    getPortPosition(nodeId, type, index) {
        const node = this.nodes[nodeId];
        if (!node || !node.el) return { x: 0, y: 0 };

        // CACHE OFFSET: Check if we already calculated the ports relative position
        // This avoids layout trashing during drag
        if (!node.portsCache) node.portsCache = {};
        const cacheKey = `${type}-${index}`;

        if (!node.portsCache[cacheKey]) {
            const portEl = node.el.querySelector(`.flow-port[data-type="${type}"][data-index="${index}"]`);
            if (!portEl) return { x: node.x, y: node.y };

            // Temporarily need rects to calculate static offset
            const portRect = portEl.getBoundingClientRect();
            const nodeRect = node.el.getBoundingClientRect();

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

    /**
     * Export flow data to JSON.
     */
    export() {
        // Map nodes to clean object
        const nodesExport = Object.values(this.nodes).map(({ el, ...rest }) => rest);
        return {
            nodes: nodesExport,
            connections: this.connections,
            zoom: this.zoom,
            canvas: { x: this.canvasX, y: this.canvasY }
        };
    }

    /**
     * Import flow data.
     */
    import(data) {
        this.canvasEl.innerHTML = `<svg id="${this.id}-svg" class="flow-connections"></svg>`;
        this.svgEl = this.canvasEl.querySelector("svg");
        this.nodes = {};
        this.connections = [];
        this.nodeIdCounter = 1;

        this.zoom = data.zoom || 1;
        this.canvasX = data.canvas?.x || 0;
        this.canvasY = data.canvas?.y || 0;
        this.updateCanvasTransform();

        if (data.nodes) {
            data.nodes.forEach(n => {
                this.addNode(n);
                if (n.id >= this.nodeIdCounter) this.nodeIdCounter = n.id + 1;
            });
        }
        if (data.connections) {
            data.connections.forEach(c => this.addConnection(c.outNodeId, c.outPort, c.inNodeId, c.inPort));
        }
    }
}

export default AIFlow;
