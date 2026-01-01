import { EmitterComponent } from "./base.js";
import Utility from "./utils.js";
import notification from "./notification.js";

class DragHandler {
  constructor(
    element,
    onMoveHandler,
    initialPosition = { x: 0, y: 0 },
    startDragPosition = { x: 0, y: 0 }
  ) {
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

    const dx = e.clientX - this.dragStartPosition.x;
    const dy = e.clientY - this.dragStartPosition.y;

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

  static register(element, onMoveHandler) {
    const dragHandler = new DragHandler(element, onMoveHandler);
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
    this.canvasX = options.canvas?.x || 0;
    this.canvasY = options.canvas?.y || 0;

    this.nodes = {}; // { id: { id, x, y, inputs, outputs, data, el } }
    this.connections = []; // [ { outputNodeId, outputPort, inputNodeId, inputPort } ]
    this.nodeIdCounter = 1;

    // DOM References
    this.canvasEl = null;
    this.svgEl = null;

    this.MOUSE_RIGHT_CLICK = 2;
    this.gridFactor = 24;
    this.nodeWidth = 200;
    this.nodeHeight = 90;
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
            class="flow-node rounded" 
            style="top: ${node.y}px; left: ${node.x}px; transform: scale(${this.zoom}); 
                    width: ${this.nodeWidth}px; height: fit-content">                        
            <div class="flow-ports-column flow-ports-in">
                ${Array.from({ length: node.inputs }, (_, i) => inputHtml.replace("{{index}}", i)).join("\n")}
            </div>
            <div class="flow-node-content card w-100">              
              <div class="card-header">${node.name}</div>
              <div class="card-body">${node.html}</div>              
            </div>            
            </button>
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

    nodeEl.onclick = (e) => this.onNodeClick(e, node.id);
    nodeEl.onmousedown = (e) => this.onNodeClick(e, node.id);

    // register drap handler
    const hl = new DragHandler(nodeEl, this.redrawNodeWithXY.bind(this, node.id), {
      x: this.nodes[node.id].x,
      y: this.nodes[node.id].y,
    });
    hl.registerDragEvent();

    nodeEl.querySelectorAll(".flow-ports-out .flow-port").forEach((port) => {
      port.onmousedown = (e) => this.mouseDownStartConnection(port, node.id, e);
    });

    nodeEl.querySelectorAll(".flow-ports-in .flow-port").forEach((port) => {
      port.onmouseup = (e) => this.mouseUpCompleteConnection(port, node.id, e);
    });

    nodeEl
      .querySelector("button.node-close")
      .addEventListener("click", (e) => this.removeNode(e, node.id));

    this.nodes[node.id].el = nodeEl;
    this.canvasEl.appendChild(nodeEl);
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
    this.connectionStart = { nodeId, index: port.dataset.index };

    // Use addEventListener instead of window.onmousemove to avoid JSDOM redefinition errors
    this._drawConnection = (e) => this.mouseMoveDrawConnection(port, nodeId, e);
    this._cancelConnection = (e) => this.keyDownCancelConnection(e, nodeId);
    window.addEventListener("mousemove", this._drawConnection);
    window.addEventListener("keydown", this._cancelConnection);

    // Clear cache for source node to ensure accurate start point
    if (this.nodes[nodeId]) this.nodes[nodeId].portOffsets = {};
  }

  mouseMoveDrawConnection(port, nodeId, event) {
    if (this.isConnecting) {
      this.renderTempConnection(port, nodeId, event);
    }
  }

  mouseUpCompleteConnection(port, nodeId, event) {
    if (this.isConnecting) {
      // Check if dropped on local input port
      const target = event.target.closest(".flow-port");
      if (target && target.dataset.type === "input") {
        const inputNodeId = parseInt(target.dataset.nodeId);
        const inputIndex = parseInt(target.dataset.index);
        this.makeConnection(
          this.connectionStart.nodeId,
          this.connectionStart.index,
          inputNodeId,
          inputIndex,
          event,
          nodeId
        );
      }
    }
  }

  makeConnection(outNodeId, outPort, inNodeId, inPort, event = null, nodeId = null) {
    const connected = this.addConnection(outNodeId, outPort, inNodeId, inPort);
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
    this.nodes[id].portOffsets = {};
    this.updateConnections(id);
  }

  removeNode(event, nodeId) {
    console.log("FLOW: removing node ", nodeId);
    event.stopPropagation();
    const id = parseInt(nodeId);
    const relevant = this.connections.filter((c) => c.outNodeId === id || c.inNodeId === id);

    relevant.forEach((conn) => {
      const pathId = `${conn.outNodeId}:${conn.outPort}-${conn.inNodeId}:${conn.inPort}`;
      const path = this.svgEl.querySelector(`path[data-id="${pathId}"]`);
      console.log("FLOW: removing node path ", pathId);
      this.removePath(path, conn);
    });

    this.nodes[nodeId].el.remove();
    delete this.nodes[nodeId];
  }

  addConnection(outNodeId, outPort, inNodeId, inPort) {
    if (!this.doMakeConnection(outNodeId, inNodeId)) {
      notification.warning("This connection will create cyclic flow.");
      this.badTempConnection();
      this.badConnection = true;
      return false;
    }

    this.badConnection = false;
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

    // This is important to ensure that the connection is created after the node is rendered
    // when it is added programmatically, not from the drawing
    const node = this.canvasEl.querySelector(`#node-${outId}`);
    Utility.observe(node, () => {
      this.createConnectionPath(connection);
    });
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

  removePath(path, conn) {
    this.removeConnCyclicCache(conn.outNodeId, conn.inNodeId);
    this.connections = this.connections.filter((c) => c !== conn);
    path.remove();
  }

  getPortPosition(nodeId, type, index) {
    const node = this.nodes[nodeId];
    if (!node || !node.el) return { x: 0, y: 0 };

    const portEl = node.el.querySelector(`.flow-port[data-type="${type}"][data-index="${index}"]`);
    if (!portEl) return { x: node.x, y: node.y };

    // Cache port offset calculations to avoid expensive DOM measurements
    const cacheKey = `${type}-${index}`;
    if (!node.portOffsets) {
      node.portOffsets = {};
    }

    if (!node.portOffsets[cacheKey]) {
      const portRect = portEl.getBoundingClientRect();
      const nodeRect = node.el.getBoundingClientRect();

      // Cache the offset relative to the node
      // IMPORTANT: Divide by zoom to get the logical offset in the transform coordinate space
      node.portOffsets[cacheKey] = {
        x: (portRect.left - nodeRect.left + portRect.width / 2) / this.zoom,
        y: (portRect.top - nodeRect.top + portRect.height / 2) / this.zoom,
      };
    }

    // Return cached offset + current node position
    const offset = node.portOffsets[cacheKey];
    return {
      x: node.x + offset.x,
      y: node.y + offset.y,
    };
  }

  getBazierPath(x1, y1, x2, y2) {
    const curvature = 0.5;
    const hx1 = x1 + Math.abs(x2 - x1) * curvature;
    const hx2 = x2 - Math.abs(x2 - x1) * curvature;

    return `M ${x1} ${y1} C ${hx1} ${y1} ${hx2} ${y2} ${x2} ${y2}`;
  }

  updateConnections(nodeId) {
    const id = parseInt(nodeId);
    const relevant = this.connections.filter((c) => c.outNodeId === id || c.inNodeId === id);

    relevant.forEach((conn) => {
      const path = this.svgEl.querySelector(
        `path[data-id="${conn.outNodeId}:${conn.outPort}-${conn.inNodeId}:${conn.inPort}"]`
      );
      if (path) {
        const p1 = this.getPortPosition(conn.outNodeId, "output", conn.outPort);
        const p2 = this.getPortPosition(conn.inNodeId, "input", conn.inPort);
        const d = this.getBazierPath(p1.x, p1.y, p2.x, p2.y);
        path.setAttribute("d", d);
      }
    });
  }

  renderTempConnection(port, nodeId, event) {
    // re-sets bad connection if there is any cyclic and path is already cleared.
    const node = this.nodes[nodeId];
    let path = this.svgEl.querySelector(".flow-connection-temp");
    if (!path) {
      path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("class", "flow-connection-path selected flow-connection-temp");
      path.style.pointerEvents = "none";
      this.svgEl.appendChild(path);
    } else {
      this.clearBadTempConnection();
    }

    const p1 = this.getPortPosition(node.id, "output", port.dataset.index);

    const rect = this.canvasEl.getBoundingClientRect();
    const mouseX = (event.clientX - rect.left) / this.zoom;
    const mouseY = (event.clientY - rect.top) / this.zoom;

    path.setAttribute("d", this.getBazierPath(p1.x, p1.y, mouseX, mouseY));
  }

  clearTempConnection() {
    const path = this.svgEl.querySelector(".flow-connection-temp");
    if (path) path.remove();
  }

  badTempConnection() {
    const path = this.svgEl.querySelector(".flow-connection-temp");
    if (path) path.classList.add("flow-connection-path-bad");
  }

  clearBadTempConnection() {
    const path = this.svgEl.querySelector(".flow-connection-temp.flow-connection-path-bad");
    if (path) path.classList.remove("flow-connection-path-bad");
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
  }

  addNodeToAdjacencyList(outNodeId, inNodeId) {
    if (!this.adjacencyList[outNodeId]) this.adjacencyList[outNodeId] = new Set();
    this.adjacencyList[outNodeId].add(inNodeId);
  }

  buildAdjacencyList() {
    this.connections.forEach((conn) => {
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
    if (stack.has(node)) return true; // cycle found
    if (visited.has(node)) return false;

    visited.add(node);
    stack.add(node);

    for (const neighbor of this.adjacencyList[node] || new Set()) {
      if (this.isCyclic(neighbor, visited, stack)) return true;
    }

    stack.delete(node);
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

    const visited = new Set();
    const stack = new Set();

    if (this.dag) {
      let virtualNeighbors = new Set(this.adjacencyList[outNodeId] || new Set());
      virtualNeighbors.add(inNodeId);

      visited.add(outNodeId);
      stack.add(outNodeId);
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
  }
}

class FlowActions extends FlowDag {
  export() {
    // eslint-disable-next-line no-unused-vars
    const nodesExport = Object.values(this.nodes).map(({ el, ...rest }) => rest);
    return {
      nodes: nodesExport,
      connections: this.connections,
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
