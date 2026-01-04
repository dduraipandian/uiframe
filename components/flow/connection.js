import { EmitterComponent } from "../base.js";
import DragHandler from "./utils.js";
import * as Constant from "./constants.js";

class FlowConnection extends EmitterComponent {
    constructor({ outNodeId, outPort, inNodeId, inPort, options = {} }) {
        super({ name: outNodeId + "-" + outPort + "-" + inNodeId + "-" + inPort });
        this.outNodeId = outNodeId;
        this.outPort = outPort;
        this.inNodeId = inNodeId;
        this.inPort = inPort;

        this.dataID = `${this.outNodeId}:${this.outPort}-${this.inNodeId}:${this.inPort}`;

        this.options = options;
        this.zoom = options.zoom || 1;
        this.originalZoom = this.zoom;
        this.connection = null;
    }

    getDataId() {
        return this.dataID;
    }

    html() {
        return "";
    }

    init() {
        const connection = this.createConnection();
        this.container = connection;
    }

    createConnection() {
        const p1 = this.getPortPosition(this.outNodeId, "output", this.outPort);
        const p2 = this.getPortPosition(this.inNodeId, "input", this.inPort);

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const d = this.getBazierPath(p1.x, p1.y, p2.x, p2.y);
        path.setAttribute("d", d);
        path.setAttribute("class", "flow-connection-path");
        path.dataset.id = `${this.outNodeId}:${this.outPort}-${this.inNodeId}:${this.inPort}`;

        path.onclick = (e) => {
            e.stopPropagation();
            this.emit("flow:connection:remove", { data: { connection: this } });
        };
        this.connection = path;
        return this.connection;
    }
}

class FlowConnectionManager extends EmitterComponent {
    constructor({ name, connectionContainer, nodeManager, options = {} }) {
        super({ name: name + "-flow-connection-manager", options });
        this.connectionContainer = connectionContainer;
        this.nodeManager = nodeManager;
        this.options = options;
        this.zoom = options.zoom || 1;
        this.originalZoom = this.zoom;

        this.nodes = this.nodeManager.nodes;
        this.nodeIdCounter = 1;
        this.nodeWidth = options.nodeWidth || 200;
        this.nodeHeight = options.nodeHeight || 90;

        this.connections = [];
        this.pathMap = new Map();

        this.tempPath = null;
        this.badPaths = new Set();
        this.tempSource = null;
    }

    addConnection(outNodeId, outPort, inNodeId, inPort) {
        // if (!this.doMakeConnection(outNodeId, inNodeId)) {
        //     notification.warning("This connection will create cyclic flow.");
        //     this.badTempConnection(outNodeId, outPort, inNodeId, inPort);
        //     this.badConnection = true;
        //     return false;
        // }

        // this.badConnection = false;
        const outId = parseInt(outNodeId);
        const inId = parseInt(inNodeId);
        const oPort = parseInt(outPort);
        const iPort = parseInt(inPort);

        const exists = this.connections.some(
            (c) =>
                c.outNodeId === outId && c.outPort === oPort && c.inNodeId === inId && c.inPort === iPort
        );
        if (exists) return;

        const connection = { outNodeId: outId, outPort: oPort, inNodeId: inId, inPort: iPort };
        this.connections.push(connection);

        this.createConnectionPath(connection);
        this.emit(Constant.CONNECTION_CREATED_EVENT, connection);
        return true;
    }

    reset() {
        this.connections = [];
        this.pathMap.forEach(path => path.remove());
        this.pathMap.clear();
        this.clearTempPath?.();
    }

    getConnectionKey(conn) {
        return `${conn.outNodeId}:${conn.outPort}-${conn.inNodeId}:${conn.inPort}`;
    }

    createConnectionPath(conn) {
        const key = this.getConnectionKey(conn);
        const p1 = this.getPortPosition(conn.outNodeId, "output", conn.outPort);
        const p2 = this.getPortPosition(conn.inNodeId, "input", conn.inPort);

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const d = this.getBazierPath(p1.x, p1.y, p2.x, p2.y);
        path.setAttribute("d", d);
        path.setAttribute("class", "flow-connection-path");
        path.dataset.id = key;

        path.onclick = (e) => {
            e.stopPropagation();
            // this.removePath(path, conn);
            this.emit(Constant.CONNECTION_CLICKED_EVENT, conn);
        };

        this.connectionContainer.appendChild(path);
        this.pathMap.set(key, path);
    }

    updateConnections(nodeId) {
        const id = parseInt(nodeId);
        const relevant = this.connections.filter((c) => c.outNodeId === id || c.inNodeId === id);

        relevant.forEach((conn) => {
            const key = this.getConnectionKey(conn);
            const path = this.pathMap.get(key);
            if (!path) return;

            const p1 = this.getPortPosition(conn.outNodeId, "output", conn.outPort);
            const p2 = this.getPortPosition(conn.inNodeId, "input", conn.inPort);
            const d = this.getBazierPath(p1.x, p1.y, p2.x, p2.y);
            path.setAttribute("d", d);

            this.emit(Constant.CONNECTION_UPDATED_EVENT, conn);
        });
    }

    removeConnection(conn) {
        const key = this.getConnectionKey(conn);
        const path = this.pathMap.get(key);

        if (path) {
            path.remove();
            this.pathMap.delete(key);
        }

        this.connections = this.connections.filter(c => c !== conn);
        this.emit(Constant.CONNECTION_REMOVED_EVENT, conn);
    }

    removeRelatedConnections(nodeId) {
        const relevant = this.connections.filter((c) => c.outNodeId === nodeId || c.inNodeId === nodeId);

        relevant.forEach((conn) => {
            this.removeConnection(conn);
        });
    }

    getPortPosition(nodeId, type, index) {
        const node = this.nodes[nodeId];
        if (!node || !node.el) return { x: 0, y: 0 };

        const portEl = node.el.querySelector(`.flow-port[data-type="${type}"][data-index="${index}"]`);
        if (!portEl) return { x: node.x, y: node.y };

        const portRect = portEl.getBoundingClientRect();
        const nodeRect = node.el.getBoundingClientRect();

        const offsetX = (portRect.left - nodeRect.left + portRect.width / 2) / this.zoom;
        const offsetY = (portRect.top - nodeRect.top + portRect.height / 2) / this.zoom;

        return {
            x: node.x + offsetX,
            y: node.y + offsetY,
        };
    }

    getBazierPath(x1, y1, x2, y2) {
        const curvature = 0.5;
        const hx1 = x1 + Math.abs(x2 - x1) * curvature;
        const hx2 = x2 - Math.abs(x2 - x1) * curvature;

        return `M ${x1} ${y1} C ${hx1} ${y1} ${hx2} ${y2} ${x2} ${y2}`;
    }

    beginTempConnection(fromNodeId, fromPortIndex) {
        this.tempSource = { nodeId: fromNodeId, portIndex: fromPortIndex };
    }

    endTempConnection() {
        this.tempSource = null;
        this.clearTempPath();
    }

    updateTempConnection(mouseX, mouseY) {
        if (!this.tempSource) return;

        const { nodeId, portIndex } = this.tempSource;
        const p1 = this.getPortPosition(nodeId, "output", portIndex);

        this.createTempPath(p1, { x: mouseX, y: mouseY });
    }

    createTempPath(p1, p2) {
        if (!this.tempPath) {
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("class", "flow-connection-path selected flow-connection-temp");
            path.style.pointerEvents = "none";
            this.connectionContainer.appendChild(path);
            this.tempPath = path;
        } else {
            this.clearBadPaths()
        }

        const d = this.getBazierPath(p1.x, p1.y, p2.x, p2.y);
        this.tempPath.setAttribute("d", d);
    }

    // bad connection path (cyclic in DAG) will be cleared on below scenario
    // 1. drawing new (temp) connection
    // 2. cancel drawing connection this.keyDownCancelConnection
    clearTempPath() {
        if (this.tempPath) {
            this.tempPath.remove();
            this.tempPath = null;
        }
        this.clearBadPaths();
    }

    markPathBad(conn) {
        this.markTempPathBad();
        this.markExistingPathBad(conn);
    }

    markTempPathBad() {
        if (this.tempPath) {
            this.tempPath.classList.add("flow-connection-path-bad");
            this.badPaths.add(this.tempPath);
        }
    }

    markExistingPathBad(conn) {
        const key = this.getConnectionKey(conn);
        const path = this.pathMap.get(key);
        if (path) {
            path.classList.add("flow-connection-path-bad");
            this.badPaths.add(path);
        }
    }

    clearBadPaths() {
        this.badPaths.forEach(path => {
            path.classList.remove("flow-connection-path-bad");
        });
        this.badPaths.clear();
    }
}

export default FlowConnectionManager;