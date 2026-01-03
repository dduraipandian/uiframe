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

        // this.createConnectionPath(connection);
        this.emit(Constant.CONNECTION_ADDED_EVENT, connection);
        return true;
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
            this.removePath(path, conn);
        };

        this.svgEl.appendChild(path);
    }

    updateConnections(nodeId) {
        const id = parseInt(nodeId);
        const relevant = this.connections.filter((c) => c.outNodeId === id || c.inNodeId === id);

        relevant.forEach((conn) => {
            // const path = this.svgEl.querySelector(
            //     `path[data-id="${conn.outNodeId}:${conn.outPort}-${conn.inNodeId}:${conn.inPort}"]`
            // );
            // if (path) {
            //     const p1 = this.getPortPosition(conn.outNodeId, "output", conn.outPort);
            //     const p2 = this.getPortPosition(conn.inNodeId, "input", conn.inPort);
            //     const d = this.getBazierPath(p1.x, p1.y, p2.x, p2.y);
            //     path.setAttribute("d", d);
            // }
            this.emit(Constant.CONNECTION_UPDATED_EVENT, conn);
        });
    }

    // removePath(path, conn) {
    //     this.removeConnCyclicCache(conn.outNodeId, conn.inNodeId);
    //     this.connections = this.connections.filter((c) => c !== conn);
    //     path.remove();
    // }

    removeConnection(conn) {
        this.connections = this.connections.filter(c => c !== conn);
        this.emit(Constant.CONNECTION_REMOVED_EVENT, conn);
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
}

export default FlowConnection;