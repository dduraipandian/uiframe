import { EmitterComponent } from "./base.js";
import notification from "./notification.js";
import FlowNodeManager from "./flow/node.js";
import FlowConnectionManager from "./flow/connection.js";
import * as Constant from "./flow/constants.js";

class DragHandler {
  constructor(
    element,
    onMoveHandler,
    initialPosition = { x: 0, y: 0 },
    startDragPosition = { x: 0, y: 0 },
    zoom = 1
  ) {
    this.element = element;
    this.onMoveHandler = onMoveHandler;
    this.zoomGetter = typeof zoom === "function" ? zoom : () => zoom;

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
    window.removeEventListener("mousemove", this.onMove.bind(this));
    window.removeEventListener("mouseup", this.onRelease.bind(this));
  }

  registerDragEvent() {
    // Canvas Panning Listeners for click and drag, draggable will not work
    // as it will go to initial position when click is released
    this.element.addEventListener("mousedown", this.onHold.bind(this));
  }

  onHold(e) {
    if (e.button === this.MOUSE_RIGHT_CLICK) {
      console.debug("FLOW: Ignoreing Right click on ", this.element);
      return;
    }

    e.stopPropagation();
    this.isDragging = true;
    this.dragStartPosition = { x: e.clientX, y: e.clientY };
    this.initialPosition = { x: this.elementX, y: this.elementY };
    this.element.style.cursor = "grabbing";

    window.addEventListener("mousemove", this.onMove.bind(this));
    window.addEventListener("mouseup", this.onRelease.bind(this));
    this.startRaf();
  }

  onMove(e) {
    if (e.button === this.MOUSE_RIGHT_CLICK) {
      console.debug("FLOW: Ignoreing Right click on", this.element);
      return;
    }
    e.stopPropagation();

    if (!this.isDragging) {
      return;
    }

    const zoom = this.zoomGetter();
    const dx = (e.clientX - this.dragStartPosition.x) / zoom;
    const dy = (e.clientY - this.dragStartPosition.y) / zoom;

    this.elementX = this.initialPosition.x + dx;
    this.elementY = this.initialPosition.y + dy;
  }

  onRelease(e) {
    if (e.button === this.MOUSE_RIGHT_CLICK) {
      console.debug("FLOW: Ignoreing right click on", this.element);
      return;
    }

    e.stopPropagation();
    this.isDragging = false;
    this.element.style.cursor = "grab";

    window.removeEventListener("mousemove", this.onMove.bind(this));
    window.removeEventListener("mouseup", this.onRelease.bind(this));
  }

  static register(element, onMoveHandler, zoom = 1) {
    const dragHandler = new DragHandler(
      element,
      onMoveHandler,
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      zoom
    );
    dragHandler.registerDragEvent();
    return dragHandler;
  }

  startRaf() {
    if (this.rafId) return;

    const loop = () => {
      if (!this.isDragging) {
        cancelAnimationFrame(this.rafId);
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
    return `
            <div id="${this.id}-flow-container" class="uiframe-flow-container">
                <div id="${this.id}-canvas" 
                    class="flow-canvas" 
                    style="transform: translate(${this.canvasX}px, ${this.canvasY}px) scale(${this.zoom})">
                <svg id="${this.id}-svg" class="flow-connections"></svg>
                </div>
                <ul class="list-group flow-toolbar list-group-horizontal-sm zoom-actions" style="width: fit-content;">
                  <a href="#" class="list-group-item list-group-item-action" id="${this.id}-zoomin" data-action="zoomin"><i class="bi bi-plus-lg"></i></a>                  
                  <a href="#" class="list-group-item list-group-item-action" id="${this.id}-zoomreset" data-action="zoomreset"><i class="bi bi-justify"></i></a>
                  <a href="#" class="list-group-item list-group-item-action" id="${this.id}-zoomout" data-action="zoomout"><i class="bi bi-dash-lg"></i></a>
                </ul>
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
    this.containerEl.addEventListener("wheel", this.onCanvasWheelZoom.bind(this), {
      passive: false,
    });

    // Drop listener for adding new nodes from outside
    this.containerEl.addEventListener("dragover", (e) => e.preventDefault());
    this.containerEl.addEventListener("drop", this.onDrop.bind(this));

    this.zoomInEl = this.containerEl.querySelector(`#${this.id}-zoomin`);
    this.zoomOutEl = this.containerEl.querySelector(`#${this.id}-zoomout`);
    this.zoomResetEl = this.containerEl.querySelector(`#${this.id}-zoomreset`);
    this.zoomInEl.addEventListener("click", this.onZoomAction.bind(this));
    this.zoomOutEl.addEventListener("click", this.onZoomAction.bind(this));
    this.zoomResetEl.addEventListener("click", this.onZoomAction.bind(this));

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

    this.nodeManager.on(Constant.NODE_MOVED_EVENT, ({ id, x, y }) => {
      console.debug("Node is moved: ", id, x, y)
      this.emit(Constant.NODE_MOVED_EVENT, { id, x, y });
      this.connectionManager.updateConnections(id);
    });

    this.connectionManager.on(Constant.CONNECTION_CREATED_EVENT, (connection) => {
      console.debug("Connection is created: ", connection)
      this.emit(Constant.CONNECTION_CREATED_EVENT, connection);
    });

    this.connectionManager.on(Constant.CONNECTION_CLICKED_EVENT, (connection) => {
      console.debug("Connection is clicked: ", connection)
      this.emit(Constant.CONNECTION_CLICKED_EVENT, connection);
    });
  }

  onZoomAction(e) {
    e.preventDefault();
    const action = e.currentTarget.dataset.action;
    switch (action) {
      case "zoomin":
        this.zoom += 0.1;
        break;
      case "zoomout":
        this.zoom -= 0.1;
        break;
      case "zoomreset":
        this.zoom = this.originalZoom;
        break;
    }
    this.redrawCanvas();
  }

  zoomChangeUpdate() {
    if (this.zoom === this.originalZoom) {
      this.zoomInEl.classList.remove("active");
      this.zoomOutEl.classList.remove("active");
    } else if (this.zoom > this.originalZoom) {
      this.zoomInEl.classList.add("active");
      this.zoomOutEl.classList.remove("active");
    } else {
      this.zoomInEl.classList.remove("active");
      this.zoomOutEl.classList.add("active");
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

      this.addNode({
        name: data.name,
        inputs: data.inputs,
        outputs: data.outputs,
        x,
        y,
        html: data.html,
      });
    } catch (err) {
      console.error("Invalid drop data", err);
    }
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

  mouseDownStartConnection(port, nodeId, event) {
    console.debug("FLOW: Start connection from port: ", port, "nodeId: ", nodeId);
    event.stopPropagation();
    this.isConnecting = true;

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
        const connected = this.makeConnection(
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

  makeConnection(outNodeId, outPort, inNodeId, inPort, event = null, nodeId = null) {
    const connected = this.connectionManager.addConnection(outNodeId, outPort, inNodeId, inPort);
    if (event && connected) this.keyDownCancelConnection(event, nodeId);
    return connected;
  }

  // eslint-disable-next-line no-unused-vars
  keyDownCancelConnection(event, nodeId) {
    console.log(event);
    // ESCAPE key pressed
    if (event.type == "keydown" && event.keyCode != 27) {
      return;
    }

    this.isConnecting = false;
    this.clearTempConnection();

    if (this._drawConnection) {
      window.removeEventListener("mousemove", this._drawConnection);
      window.removeEventListener("keydown", this._cancelConnection);
      this._drawConnection = null;
    }
  }

  // handling mouse left click on node
  onNodeClick(e, id) {
    this.canvasEl.querySelectorAll(".flow-node").forEach((n) => n.classList.remove("selected"));
    this.nodes[id].el.classList.add("selected");
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
    this.zoomChangeUpdate();
  }

  removeNode(event, nodeId) {
    console.log("FLOW: removing node ", nodeId);
    event.stopPropagation();
    const id = parseInt(nodeId);
    const relevant = this.connectionManager.connections.filter((c) => c.outNodeId === id || c.inNodeId === id);

    relevant.forEach((conn) => {
      const pathId = `${conn.outNodeId}:${conn.outPort}-${conn.inNodeId}:${conn.inPort}`;
      const path = this.svgEl.querySelector(`path[data-id="${pathId}"]`);
      console.log("FLOW: removing node path ", pathId);
      this.connectionManager.removeConnection(conn);
    });

    this.nodes[nodeId].el.remove();
    delete this.nodes[nodeId];
  }
}

class FlowDag extends Flow {
  constructor({ name, options = {} }) {
    super({ name, options });
    this.dag = options.dag ?? true;
    console.log(this.dag);
    this.adjacencyList = {};
    this.nonCyclicCache = {};
    this.tempCyclicCache = {};
    this.tempStackCache = {};
  }

  addNodeToAdjacencyList(outNodeId, inNodeId) {
    if (!this.adjacencyList[outNodeId]) this.adjacencyList[outNodeId] = new Set();
    this.adjacencyList[outNodeId].add(inNodeId);
  }

  buildAdjacencyList() {
    this.connectionManager.connections.forEach((conn) => {
      this.addNodeToAdjacencyList(conn.outNodeId, conn.inNodeId);
    });
    return this.adjacencyList;
  }

  isNewConnCyclic(outNodeId, inNodeId, visited, stack) {
    visited.add(outNodeId);
    stack.push(outNodeId);
    if (this.adjacencyList[inNodeId] && this.adjacencyList[inNodeId].has(outNodeId)) {
      return true;
    }
    for (const neighbor of this.adjacencyList[outNodeId]) {
      if (this.isNewConnCyclic(neighbor, inNodeId, visited, stack)) {
        return true;
      }
    }
    stack.pop();
    return false;
  }

  isCyclic(node, visited, stack) {
    if (stack.includes(node)) {
      // cycle found
      // adding last node to stack to show the cycle in the UI
      stack.push(node);
      return true;
    }
    if (visited.has(node)) return false;

    visited.add(node);
    stack.push(node);

    console.log(stack);

    for (const neighbor of this.adjacencyList[node] || new Set()) {
      if (this.isCyclic(neighbor, visited, stack)) return true;
    }

    stack.pop();
    return false;
  }

  doMakeConnection(outNodeId, inNodeId) {
    const cacheKey = `${outNodeId}->${inNodeId}`;

    if (this.nonCyclicCache[cacheKey] !== undefined) {
      return !this.nonCyclicCache[cacheKey];
    }

    if (this.tempCyclicCache[cacheKey] !== undefined) {
      return false;
    }

    this.tempStackCache[cacheKey] = [];
    let stack = this.tempStackCache[cacheKey];
    const visited = new Set();

    if (this.dag) {
      let virtualNeighbors = new Set(this.adjacencyList[outNodeId] || new Set());
      virtualNeighbors.add(inNodeId);

      visited.add(outNodeId);
      stack.push(outNodeId);
      for (const vNeighbor of virtualNeighbors) {
        if (this.isCyclic(vNeighbor, visited, stack)) {
          this.tempCyclicCache[cacheKey] = true;
          return false;
        }
      }
    }

    this.addNodeToAdjacencyList(outNodeId, inNodeId);

    // add to cache only when we make a connection
    // if the connection is cyclic, connection from the graph can be removed and updated again to create new connection.
    this.addConnNonCyclicCache(outNodeId, inNodeId);
    return true;
  }

  removeConnCyclicCache(outNodeId, inNodeId) {
    const cacheKey = `${outNodeId}->${inNodeId}`;
    console.log(this.adjacencyList, this.adjacencyList[outNodeId]);
    this.adjacencyList[outNodeId].delete(inNodeId);
    delete this.nonCyclicCache[cacheKey];

    // remove all temporary cyclic cache.
    // This is partial fix for now, as we need to traverse the graph to remove the affected temporary connection cache.
    // Efficient when no connections are removed to make a DAG.
    this.tempCyclicCache = {};
  }

  addConnNonCyclicCache(outNodeId, inNodeId) {
    const cacheKey = `${outNodeId}->${inNodeId}`;
    this.nonCyclicCache[cacheKey] = false;
    delete this.tempStackCache[cacheKey];
  }
}

class FlowActions extends FlowDag {
  export() {
    // eslint-disable-next-line no-unused-vars
    const nodesExport = Object.values(this.nodes).map(({ el, ...rest }) => rest);
    return {
      nodes: nodesExport,
      connections: this.connectionManager.connections,
      zoom: this.zoom,
      canvas: { x: this.canvasX, y: this.canvasY },
    };
  }

  import(data) {
    this.canvasEl.innerHTML = `<svg id="${this.id}-svg" class="flow-connections"></svg>`;
    this.svgEl = this.canvasEl.querySelector("svg");
    this.nodes = {};
    this.connections = [];
    this.nodeIdCounter = 1;

    this.zoom = data.zoom || 1;
    this.canvasX = data.canvas?.x || 0;
    this.canvasY = data.canvas?.y || 0;
    this.redrawCanvas();

    if (data.nodes) {
      data.nodes.forEach((n) => {
        this.addNode(n);
        if (n.id >= this.nodeIdCounter) this.nodeIdCounter = n.id + 1;
      });
    }
    if (data.connections) {
      data.connections.forEach((c) =>
        this.makeConnection(c.outNodeId, c.outPort, c.inNodeId, c.inPort)
      );
    }
  }
}

export { FlowActions as Flow };