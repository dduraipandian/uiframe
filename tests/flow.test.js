import { Flow } from "../components/flow.js";

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
    flow.init();

    expect(flow.zoom).toBe(1.5);
    const canvas = container.querySelector(".flow-canvas");
    expect(canvas).not.toBeNull();
    // Verify transform style
    expect(canvas.style.transform).toContain("scale(1.5)");
  });

  test("should add nodes to canvas and data structure", () => {
    const flow = new Flow({ name: "TestFlow" });
    flow.renderInto(container);
    flow.init();

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
    expect(nodeEl.querySelector(".flow-node-header").textContent).toBe("Node 1");
    expect(nodeEl.querySelectorAll('.flow-port[data-type="input"]').length).toBe(1);
    expect(nodeEl.querySelectorAll('.flow-port[data-type="output"]').length).toBe(2);
  });

  test("should add connections between nodes", () => {
    const flow = new Flow({ name: "TestFlow" });
    flow.renderInto(container);
    flow.init();

    const n1 = flow.addNode({ name: "N1", inputs: 0, outputs: 1 });
    const n2 = flow.addNode({ name: "N2", inputs: 1, outputs: 0 });

    flow.addConnection(n1, 0, n2, 0);

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

  test("should move node on drag", async () => {
    const flow = new Flow({ name: "TestFlow" });
    flow.renderInto(container);
    flow.init();

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
    flow.init();

    const n1 = flow.addNode({ name: "N1", x: 0, y: 0, outputs: 1 });
    const n2 = flow.addNode({ name: "N2", x: 200, y: 0, inputs: 1 });
    flow.addConnection(n1, 0, n2, 0);

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
    flow.init();

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

    const containerEl = container.querySelector(".flow-container");
    containerEl.dispatchEvent(dropEvent);

    const nodes = Object.values(flow.nodes);
    expect(nodes.find((n) => n.name === "Dropped Node")).toBeDefined();
    expect(container.querySelector(".flow-node-header").textContent).toBe("Dropped Node");
  });

  test("should create connection by dragging ports", () => {
    const flow = new Flow({ name: "TestFlow" });
    flow.renderInto(container);
    flow.init();

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
});
