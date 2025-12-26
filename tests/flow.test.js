import { Flow } from "../components/flow.js";
import notification from "../components/notification.js";

jest.mock("../components/notification.js");

describe("Flow Component", () => {
  let container;
  beforeEach(() => {
    // Mock IntersectionObserver
    global.IntersectionObserver = class IntersectionObserver {
      constructor(callback) {
        this.callback = callback;
      }
      observe(element) {
        // Trigger callback immediately for tests
        this.callback([{ isIntersecting: true, target: element }]);
      }
      unobserve() {
        return null;
      }
      disconnect() {
        return null;
      }
    };

    // Mock requestAnimationFrame
    global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
    global.cancelAnimationFrame = (id) => clearTimeout(id);

    container = document.createElement("div");
    container.id = "test-container";
    document.body.appendChild(container);

    // Mock getBoundingClientRect for layout calculations
    Element.prototype.getBoundingClientRect = jest.fn(() => ({
      width: 100,
      height: 100,
      top: 0,
      left: 0,
      bottom: 100,
      right: 100,
      x: 0,
      y: 0,
    }));
  });

  afterEach(() => {
    document.body.innerHTML = "";
    jest.clearAllMocks();
  });

  test("should initialize correctly", () => {
    const flow = new Flow({ name: "TestFlow", options: { zoom: 1.5 } });
    flow.renderInto(container);

    expect(flow.zoom).toBe(1.5);
    const canvas = container.querySelector(".flow-canvas");
    expect(canvas).not.toBeNull();
    // Verify transform style
    expect(canvas.style.transform).toContain("scale(1.5)");
  });

  test("should add nodes to canvas and data structure", () => {
    const flow = new Flow({ name: "TestFlow" });
    flow.renderInto(container);

    const nodeId = flow.addNode({
      name: "Node 1",
      inputs: 1,
      outputs: 2,
      x: 100,
      y: 200,
      html: "Content",
    });

    // Check data
    expect(flow.nodes[nodeId]).toBeDefined();
    expect(flow.nodes[nodeId].inputs).toBe(1);
    expect(flow.nodes[nodeId].outputs).toBe(2);

    // Check DOM
    const nodeEl = container.querySelector(`#node-${nodeId}`);
    expect(nodeEl).not.toBeNull();
    expect(nodeEl.querySelector(".card-header").textContent).toBe("Node 1");
    expect(nodeEl.querySelectorAll('.flow-port[data-type="input"]').length).toBe(1);
    expect(nodeEl.querySelectorAll('.flow-port[data-type="output"]').length).toBe(2);
  });

  test("should add connections between nodes", () => {
    const flow = new Flow({ name: "TestFlow" });
    flow.renderInto(container);

    const n1 = flow.addNode({ name: "N1", inputs: 0, outputs: 1 });
    const n2 = flow.addNode({ name: "N2", inputs: 1, outputs: 0 });

    flow.makeConnection(n1, 0, n2, 0);

    expect(flow.connections.length).toBe(1);
    expect(flow.connections[0]).toEqual({
      outNodeId: n1,
      outPort: 0,
      inNodeId: n2,
      inPort: 0,
    });

    // Verify SVG path creation
    const svg = container.querySelector("svg.flow-connections");
    expect(svg.querySelectorAll("path").length).toBe(1);
  });

  test("should not add connections between nodes when cyclic", () => {
    const flow = new Flow({ name: "TestFlow" });
    flow.renderInto(container);

    const n1 = flow.addNode({ name: "N1", inputs: 0, outputs: 1 });
    const n2 = flow.addNode({ name: "N2", inputs: 1, outputs: 1 });
    const n3 = flow.addNode({ name: "N3", inputs: 1, outputs: 2 });
    const n4 = flow.addNode({ name: "N4", inputs: 1, outputs: 1 });

    let connected = flow.makeConnection(n1, 0, n2, 0);
    connected = flow.makeConnection(n2, 0, n3, 0);
    expect(connected).toBeTruthy();

    flow.makeConnection(n3, 1, n4, 0);

    connected = flow.makeConnection(n4, 0, n2, 0);
    expect(connected).not.toBeTruthy();

    expect(flow.connections.length).toBe(3);

    // Verify notification was called
    expect(notification.warning).toHaveBeenCalled();
  });

  test("should add connections between nodes when cyclic if flow is non-dag", () => {
    const flow = new Flow({ name: "TestFlow", options: { dag: false } });
    flow.renderInto(container);

    const n1 = flow.addNode({ name: "N1", inputs: 0, outputs: 1 });
    const n2 = flow.addNode({ name: "N2", inputs: 1, outputs: 0 });
    const n3 = flow.addNode({ name: "N3", inputs: 1, outputs: 1 });

    let connected = flow.makeConnection(n1, 0, n2, 0);
    connected = flow.makeConnection(n3, 0, n2, 0);

    connected = flow.makeConnection(n2, 0, n3, 0);

    expect(flow.dag).toBe(false);
    expect(connected).toBeTruthy();

    expect(flow.connections.length).toBe(3);
    expect(flow.connections[1]).toEqual({
      outNodeId: n3,
      outPort: 0,
      inNodeId: n2,
      inPort: 0,
    });

    // Verify SVG path creation
    const svg = container.querySelector("svg.flow-connections");
    expect(svg.querySelectorAll("path").length).toBe(3);
  });

  test("should move node on drag", async () => {
    const flow = new Flow({ name: "TestFlow" });
    flow.renderInto(container);

    const nodeId = flow.addNode({ name: "Draggable", x: 10, y: 10 });
    const nodeEl = container.querySelector(`#node-${nodeId}`);

    // Simulate Drag
    nodeEl.dispatchEvent(new MouseEvent("mousedown", { clientX: 0, clientY: 0, bubbles: true }));
    nodeEl.dispatchEvent(new MouseEvent("mousemove", { clientX: 50, clientY: 50, bubbles: true }));

    // Wait for RAF
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(flow.nodes[nodeId].x).toBe(60); // 10 + 50
    expect(flow.nodes[nodeId].y).toBe(60); // 10 + 50
    expect(nodeEl.style.left).toBe("60px");
    expect(nodeEl.style.top).toBe("60px");

    nodeEl.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  });

  test("should update connection position on node drag", async () => {
    const flow = new Flow({ name: "TestFlow" });
    flow.renderInto(container);

    const n1 = flow.addNode({ name: "N1", x: 0, y: 0, outputs: 1 });
    const n2 = flow.addNode({ name: "N2", x: 200, y: 0, inputs: 1 });
    flow.makeConnection(n1, 0, n2, 0);

    const path = container.querySelector("path.flow-connection-path");
    const initialD = path.getAttribute("d");

    // Drag node 1
    const nodeEl = container.querySelector(`#node-${n1}`);
    nodeEl.dispatchEvent(new MouseEvent("mousedown", { clientX: 0, clientY: 0, bubbles: true }));
    nodeEl.dispatchEvent(new MouseEvent("mousemove", { clientX: 100, clientY: 0, bubbles: true }));

    await new Promise((resolve) => setTimeout(resolve, 10));

    const updatedD = path.getAttribute("d");
    expect(updatedD).not.toBe(initialD);
    expect(updatedD).toContain("M 150"); // Port 1 should have moved with node (100 + 50 offset)
  });

  test("should create node on drop", () => {
    const flow = new Flow({ name: "TestFlow" });
    flow.renderInto(container);

    const dropEvent = new MouseEvent("drop", {
      clientX: 500,
      clientY: 500,
      bubbles: true,
    });

    // Mock dataTransfer
    const nodeData = { name: "Dropped Node", inputs: 1, outputs: 1, html: "<b>Drop</b>" };
    dropEvent.dataTransfer = {
      getData: jest.fn((type) => (type === "application/json" ? JSON.stringify(nodeData) : "")),
    };

    const containerEl = container.querySelector(".uiframe-flow-container");
    containerEl.dispatchEvent(dropEvent);

    const nodes = Object.values(flow.nodes);
    expect(nodes.find((n) => n.name === "Dropped Node")).toBeDefined();
    expect(container.querySelector(".card-header").textContent).toBe("Dropped Node");
  });

  test("should create connection by dragging ports", () => {
    const flow = new Flow({ name: "TestFlow" });
    flow.renderInto(container);

    const n1 = flow.addNode({ name: "Out", x: 0, y: 0, outputs: 1 });
    const n2 = flow.addNode({ name: "In", x: 200, y: 0, inputs: 1 });

    const outPort = container.querySelector(`#node-${n1} .flow-port[data-type="output"]`);
    const inPort = container.querySelector(`#node-${n2} .flow-port[data-type="input"]`);

    // Start drag from output
    outPort.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    expect(flow.isConnecting).toBe(true);

    // Move mouse
    window.dispatchEvent(new MouseEvent("mousemove", { clientX: 100, clientY: 100 }));
    expect(container.querySelector(".flow-connection-temp")).not.toBeNull();

    // Release on input
    inPort.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));

    expect(flow.connections.length).toBe(1);
    expect(flow.connections[0].outNodeId).toBe(n1);
    expect(flow.connections[0].inNodeId).toBe(n2);
    expect(container.querySelector(".flow-connection-temp")).toBeNull();
  });

  test("should remove connection when clicking on path", () => {
    const flow = new Flow({ name: "TestFlow" });
    flow.renderInto(container);

    const n1 = flow.addNode({ name: "N1", x: 0, y: 0, inputs: 0, outputs: 1 });
    const n2 = flow.addNode({ name: "N2", x: 200, y: 0, inputs: 1, outputs: 0 });

    flow.makeConnection(n1, 0, n2, 0);

    // Verify initial state
    expect(flow.connections.length).toBe(1);
    const path = container.querySelector("path.flow-connection-path");
    expect(path).not.toBeNull();

    // Click on the connection path to remove it
    path.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    // Verify connection was removed
    expect(flow.connections.length).toBe(0);
    expect(container.querySelector("path.flow-connection-path")).toBeNull();

    // Verify nodes still exist
    expect(Object.keys(flow.nodes).length).toBe(2);
    expect(container.querySelector(`#node-${n1}`)).not.toBeNull();
    expect(container.querySelector(`#node-${n2}`)).not.toBeNull();
  });

  test("should remove node", () => {
    const flow = new Flow({ name: "TestFlow" });
    flow.renderInto(container);

    const n1 = flow.addNode({ name: "N1", x: 0, y: 0, inputs: 0, outputs: 1 });
    const n2 = flow.addNode({ name: "N2", x: 200, y: 0, inputs: 1, outputs: 1 });
    const n3 = flow.addNode({ name: "N3", x: 400, y: 0, inputs: 1, outputs: 1 });
    const n4 = flow.addNode({ name: "N4", x: 600, y: 0, inputs: 1, outputs: 0 });

    flow.makeConnection(n1, 0, n2, 0);
    flow.makeConnection(n2, 0, n3, 0);
    flow.makeConnection(n3, 0, n4, 0);

    expect(Object.keys(flow.nodes).length).toBe(4);
    expect(flow.connections.length).toBe(3);
    expect(container.querySelectorAll(".flow-node").length).toBe(4);
    expect(container.querySelectorAll("path.flow-connection-path").length).toBe(3);

    const node = container.querySelector(`#node-${n2}`);
    const closeBtn = node.querySelector("button.node-close");

    closeBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(flow.nodes[n2]).toBeUndefined();
    expect(Object.keys(flow.nodes).length).toBe(3);
    expect(container.querySelector(`#node-${n2}`)).toBeNull();
    expect(flow.connections.length).toBe(1);
    expect(container.querySelectorAll("path.flow-connection-path").length).toBe(1);

    const pathId = "3:0-4:0";
    const path = flow.svgEl.querySelector(`path[data-id="${pathId}"]`);
    expect(path).not.toBeNull();

    const pathId2 = "1:0-2:0";
    const path2 = flow.svgEl.querySelector(`path[data-id="${pathId2}"]`);
    expect(path2).toBeNull();
  });

  test("should cancel connection on ESC keydown while drawing", () => {
    const flow = new Flow({ name: "TestFlow" });
    flow.renderInto(container);

    const n1 = flow.addNode({ name: "Out", x: 0, y: 0, outputs: 1 });

    const outPort = container.querySelector(`#node-${n1} .flow-port[data-type="output"]`);

    // Start drag from output port
    outPort.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    expect(flow.isConnecting).toBe(true);

    // Move mouse to draw temp connection
    window.dispatchEvent(new MouseEvent("mousemove", { clientX: 100, clientY: 100 }));
    expect(container.querySelector(".flow-connection-temp")).not.toBeNull();

    // Press ESC key to cancel
    window.dispatchEvent(new KeyboardEvent("keydown", { keyCode: 27, bubbles: true }));

    // Verify connection was cancelled
    expect(flow.isConnecting).toBe(false);
    expect(container.querySelector(".flow-connection-temp")).toBeNull();
    expect(flow.connections.length).toBe(0);

    const path = flow.svgEl.querySelector("path");
    expect(path).toBeNull();
  });
});
