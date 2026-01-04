class FlowSerializer {
  export(flow) {
    const nodeManager = flow.nodeManager;
    const connectionManager = flow.connectionManager;
    const canvas = flow.canvas;

    // eslint-disable-next-line no-unused-vars
    const nodes = Object.values(nodeManager.nodes).map(({ el, node, ...rest }) => ({
      id: rest.id,
      name: rest.name,
      inputs: rest.inputs,
      outputs: rest.outputs,
      x: rest.x,
      y: rest.y,
      html: rest.html,
    }));

    const connections = connectionManager.connections.map((c) => ({
      outNodeId: c.outNodeId,
      outPort: c.outPort,
      inNodeId: c.inNodeId,
      inPort: c.inPort,
    }));

    return {
      nodes,
      connections,
      zoom: canvas.zoom,
      canvas: {
        x: canvas.canvasX,
        y: canvas.canvasY,
      },
    };
  }
  import(flow, data) {
    const { nodeManager, connectionManager, canvas } = flow;

    // 1. Reset canvas
    canvas.zoom = data.zoom || 1;
    canvas.canvasX = data.canvas?.x || 0;
    canvas.canvasY = data.canvas?.y || 0;
    canvas.redrawCanvas();

    // 2. Reset managers
    nodeManager.reset?.();
    connectionManager.reset?.();

    // 3. Recreate nodes
    if (data.nodes) {
      data.nodes.forEach((n) => {
        nodeManager.addNode(n);
      });
    }

    // 4. Recreate connections (validators already active)
    if (data.connections) {
      data.connections.forEach((c) => {
        flow.makeConnection(c.outNodeId, c.outPort, c.inNodeId, c.inPort);
      });
    }
  }
}

export default FlowSerializer;
