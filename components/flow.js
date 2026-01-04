import { EmitterComponent } from "./base.js";
import FlowCanvas from "./flow/canvas.js";
import FlowNodeManager from "./flow/node.js";
import FlowConnectionManager from "./flow/connection.js";
import FlowSerializer from "./flow/serializer.js";
import * as Constant from "./flow/constants.js";


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
  constructor({ name, options = {}, validators = [], notification = null }) {
    super({ name });

    this.options = options;
    this.validators = validators;
    this.serializer = new FlowSerializer();
    this.zoom = options.zoom || 1;
    this.originalZoom = this.zoom;
    this.canvasX = options.canvas?.x || 0;
    this.canvasY = options.canvas?.y || 0;

    this.nodes = {}; // { id: { id, x, y, inputs, outputs, data, el } }
    // this.connections = []; // [ { outputNodeId, outputPort, inputNodeId, inputPort } ]
    this.nodeIdCounter = 1;

    // DOM References
    this.canvasEl = null;
    this.svgEl = null;

    this.MOUSE_RIGHT_CLICK = 2;
    this.gridFactor = 24;
    this.nodeWidth = 200;
    this.nodeHeight = 90;

    this.zoomInEl = null;
    this.zoomOutEl = null;
    this.zoomResetEl = null;

    this.nodeManager = null;
    this.connectionManager = null;
  }

  /**
   * Returns component HTML structure.
   */
  html() {
    return ``;
  }

  init() {
    this.container.classList.add("uiframe-flow-container");

    this.canvas = new FlowCanvas({
      name: this.name + "-canvas",
      options: this.options
    });

    this.canvas.renderInto(this.container);

    this.containerEl = this.container;
    this.canvasEl = this.canvas.canvasEl;
    this.svgEl = this.canvas.svgEl;

    this.nodeManager = new FlowNodeManager({
      name: this.name + "-flow-node-manager",
      canvasContainer: this.canvasEl,
      options: this.options
    });

    this.connectionManager = new FlowConnectionManager({
      name: this.name + "-flow-connection-manager",
      connectionContainer: this.svgEl,
      nodeManager: this.nodeManager,
      options: this.options
    });

    this.canvas.on("canvas:zoom", ({ data }) => {
      this.zoom = data.zoom;
      this.connectionManager.zoom = data.zoom;
      this.nodeManager.zoom = data.zoom;
    });

    this.canvas.on("node:dropped", ({ data }) => {
      console.debug("Node is dropped: ", data)
      this.emit(Constant.NODE_DROPPED_EVENT, data);
      this.nodeManager.dropNode(data);
    });

    this.nodeManager.on(Constant.NODE_MOVED_EVENT, ({ id, x, y }) => {
      console.debug("Node is moved: ", id, x, y)
      this.emit(Constant.NODE_MOVED_EVENT, { id, x, y });
      this.connectionManager.updateConnections(id);
    });

    this.nodeManager.on(Constant.NODE_REMOVED_EVENT, ({ id }) => {
      console.debug("Node is removed: ", id)
      this.emit(Constant.NODE_REMOVED_EVENT, { id });
      this.removeNode(id);
    });

    this.nodeManager.on("port:connect:start", ({ nodeId, portIndex, event }) => {
      this.mouseDownStartConnection({ dataset: { index: portIndex } }, nodeId, event);
    });

    this.nodeManager.on("port:connect:end", ({ nodeId, portIndex, event }) => {
      this.mouseUpCompleteConnection({ dataset: { index: portIndex } }, nodeId, event);
    });

    this.connectionManager.on(Constant.CONNECTION_CREATED_EVENT, (connection) => {
      console.debug("Connection is created: ", connection)
      this.emit(Constant.CONNECTION_CREATED_EVENT, connection);

      this.validators.forEach(v =>
        v.onConnectionAdded?.({
          outNodeId: connection.outNodeId,
          inNodeId: connection.inNodeId
        })
      );
    });

    this.connectionManager.on(Constant.CONNECTION_CLICKED_EVENT, (connection) => {
      console.debug("Connection is clicked: ", connection)
      this.emit(Constant.CONNECTION_CLICKED_EVENT, connection);
      this.connectionManager.removeConnection(connection);
    });

    this.connectionManager.on(Constant.CONNECTION_REMOVED_EVENT, (connection) => {
      console.debug("Connection is removed: ", connection)
      this.emit(Constant.CONNECTION_REMOVED_EVENT, connection);

      this.validators.forEach(v =>
        v.onConnectionRemoved?.({
          outNodeId: connection.outNodeId,
          inNodeId: connection.inNodeId
        })
      );
    });
  }

  highlightCycle(stack) {
    if (!stack || stack.length < 2) return;

    for (let pos = 0; pos < stack.length - 1; pos++) {
      const conn = this.connectionManager.connections.find(c => c.outNodeId === stack[pos] && c.inNodeId === stack[pos + 1]);
      if (conn) {
        this.connectionManager.markPathBad(conn);
      }
    }
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
  addNode(params) {
    return this.nodeManager.addNode(params);
  }

  mouseDownStartConnection(port, nodeId, event) {
    console.debug("FLOW: Start connection from port: ", port, "nodeId: ", nodeId);
    event.stopPropagation();
    this.isConnecting = true;
    this.connectionStart = { nodeId, index: port.dataset.index };
    this.connectionManager.beginTempConnection(nodeId, port.dataset.index);
    // Use addEventListener instead of window.onmousemove to avoid JSDOM redefinition errors
    this._drawConnection = (e) => this.mouseMoveDrawConnection(port, nodeId, e);
    this._cancelConnection = (e) => this.keyDownCancelConnection(e, nodeId);
    window.addEventListener("mousemove", this._drawConnection);
    window.addEventListener("keydown", this._cancelConnection);
  }

  mouseMoveDrawConnection(port, nodeId, event) {
    if (this.isConnecting) {
      const rect = this.canvasEl.getBoundingClientRect();
      const x = (event.clientX - rect.left) / this.zoom;
      const y = (event.clientY - rect.top) / this.zoom;

      this.connectionManager.updateTempConnection(x, y);
    }
  }

  mouseUpCompleteConnection(port, nodeId, event) {
    if (this.isConnecting) {
      // Check if dropped on local input port
      const target = event.target.closest(".flow-port");
      if (target && target.dataset.type === "input") {
        const inputNodeId = parseInt(target.dataset.nodeId);
        const inputIndex = parseInt(target.dataset.index);
        const connected = this.addConnection(
          this.connectionStart.nodeId,
          this.connectionStart.index,
          inputNodeId,
          inputIndex,
          event,
          nodeId
        );
        if (connected) this.connectionManager.endTempConnection();
      }
    }
  }

  addConnection(outNodeId, outPort, inNodeId, inPort, event = null, nodeId = null) {
    // const connected = this.connectionManager.addConnection(outNodeId, outPort, inNodeId, inPort);
    // if (event && connected) this.keyDownCancelConnection(event, nodeId);
    // return connected;

    for (const validator of this.validators) {
      const result = validator.onConnectionAttempt({ outNodeId, inNodeId });
      if (!result.valid) {
        this.notification?.warning(result.message);
        this.connectionManager.markTempPathBad();

        if (result.stack) {
          this.highlightCycle(result.stack);
        }
        return false;
      }
    }

    const created = this.connectionManager.addConnection(
      outNodeId,
      outPort,
      inNodeId,
      inPort
    );

    if (created) {
      this.validators.forEach(v =>
        v.onConnectionAdded?.({ outNodeId, inNodeId })
      );
      if (event) this.keyDownCancelConnection(event, nodeId);
    }

    return created;
  }

  // eslint-disable-next-line no-unused-vars
  keyDownCancelConnection(event, nodeId) {
    console.log(event);
    // ESCAPE key pressed
    if (event.type == "keydown" && event.keyCode != 27) {
      return;
    }

    this.isConnecting = false;
    this.connectionManager.clearTempPath();

    if (this._drawConnection) {
      window.removeEventListener("mousemove", this._drawConnection);
      window.removeEventListener("keydown", this._cancelConnection);
      this._drawConnection = null;
    }
  }

  removeNode(nodeId) {
    this.connectionManager.removeRelatedConnections(nodeId);
  }

  export() {
    return this.serializer.export(this);
  }

  import(data) {
    this.serializer.import(this, data);
  }
}

export default Flow;