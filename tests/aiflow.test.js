import AIFlow from "../components/aiflow.js";

describe("AIFlow Component", () => {
    let container;

    beforeEach(() => {
        container = document.createElement("div");
        container.id = "test-container";
        document.body.appendChild(container);
    });

    afterEach(() => {
        document.body.innerHTML = "";
    });

    test("should initialize correctly", () => {
        const flow = new AIFlow({ name: "TestFlow", options: { zoom: 1.5 } });
        flow.renderInto(container);
        flow.init();

        expect(flow.zoom).toBe(1.5);
        const canvas = container.querySelector(".flow-canvas");
        expect(canvas).not.toBeNull();
        // Verify transform style
        expect(canvas.style.transform).toContain("scale(1.5)");
    });

    test("should add nodes to canvas and data structure", () => {
        const flow = new AIFlow({ name: "TestFlow" });
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
        const flow = new AIFlow({ name: "TestFlow" });
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

    test("should avoid duplicate connections", () => {
        const flow = new AIFlow({ name: "TestFlow" });
        flow.renderInto(container);
        flow.init();

        const n1 = flow.addNode({ name: "N1", inputs: 0, outputs: 1 });
        const n2 = flow.addNode({ name: "N2", inputs: 1, outputs: 0 });

        flow.addConnection(n1, 0, n2, 0);
        flow.addConnection(n1, 0, n2, 0); // Duplicate

        expect(flow.connections.length).toBe(1);
    });

    test("should export and import data correctly", () => {
        const flow = new AIFlow({ name: "TestFlow" });
        flow.renderInto(container);
        flow.init();

        const n1 = flow.addNode({ name: "N1", inputs: 0, outputs: 1, x: 10, y: 10 });
        const n2 = flow.addNode({ name: "N2", inputs: 1, outputs: 0, x: 50, y: 50 });
        flow.addConnection(n1, 0, n2, 0);

        const data = flow.export();
        expect(data.nodes.length).toBe(2);
        expect(data.connections.length).toBe(1);

        // Test Import
        const flow2 = new AIFlow({ name: "ImportFlow" });
        flow2.renderInto(container);
        flow2.init();

        flow2.import(data);

        expect(Object.keys(flow2.nodes).length).toBe(2);
        expect(flow2.connections.length).toBe(1);
        // Check if IDs are preserved or re-mapped? Implementation preserves IDs.
        expect(flow2.nodes[n1]).toBeDefined();
    });
});
