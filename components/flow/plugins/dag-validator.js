import FlowValidator from "./base.js";

class DagValidator extends FlowValidator {
  constructor({ enabled = true } = {}) {
    super();
    this.enabled = enabled;
    this.adjacencyList = {};
    this.nonCyclicCache = {};
    this.tempCyclicCache = {};
    this.tempStackCache = {};
  }

  onConnectionAttempt({ outNodeId, inNodeId }) {
    const message = "This connection will create cyclic flow.";
    if (!this.enabled) return { valid: true };

    const cacheKey = `${outNodeId}->${inNodeId}`;

    if (this.nonCyclicCache[cacheKey] !== undefined) {
      return { valid: !this.nonCyclicCache[cacheKey] };
    }

    if (this.tempCyclicCache[cacheKey]) {
      return { valid: false, stack: this.tempStackCache[cacheKey], message };
    }

    this.tempStackCache[cacheKey] = [];
    const stack = this.tempStackCache[cacheKey];
    const visited = new Set();

    let virtualNeighbors = new Set(this.adjacencyList[outNodeId] || new Set());
    virtualNeighbors.add(inNodeId);

    visited.add(outNodeId);
    stack.push(outNodeId);

    for (const neighbor of virtualNeighbors) {
      if (this.#isCyclic(neighbor, visited, stack)) {
        this.tempCyclicCache[cacheKey] = true;
        return { valid: false, stack, message };
      }
    }

    return { valid: true };
  }

  onConnectionAdded({ outNodeId, inNodeId }) {
    this.#addNodeToAdjacencyList(outNodeId, inNodeId);

    // add to cache only when we make a connection
    // if the connection is cyclic, connection from the graph can be removed and updated again to create new connection.
    this.#addConnNonCyclicCache(outNodeId, inNodeId);
  }

  onConnectionRemoved({ outNodeId, inNodeId }) {
    const cacheKey = `${outNodeId}->${inNodeId}`;
    this.adjacencyList[outNodeId]?.delete(inNodeId);
    delete this.nonCyclicCache[cacheKey];

    // remove all temporary cyclic cache.
    // This is partial fix for now, as we need to traverse the graph to remove the affected temporary connection cache.
    // Efficient when no connections are removed to make a DAG.
    this.tempCyclicCache = {};
  }

  #addNodeToAdjacencyList(outNodeId, inNodeId) {
    if (!this.adjacencyList[outNodeId]) this.adjacencyList[outNodeId] = new Set();
    this.adjacencyList[outNodeId].add(inNodeId);
  }

  #addConnNonCyclicCache(outNodeId, inNodeId) {
    const cacheKey = `${outNodeId}->${inNodeId}`;
    this.nonCyclicCache[cacheKey] = false;
    delete this.tempStackCache[cacheKey];
  }

  #isCyclic(node, visited, stack) {
    if (stack.includes(node)) {
      // cycle found
      // adding last node to stack to show the cycle in the UI
      stack.push(node);
      return true;
    }
    if (visited.has(node)) return false;

    visited.add(node);
    stack.push(node);

    for (const neighbor of this.adjacencyList[node] || []) {
      if (this.#isCyclic(neighbor, visited, stack)) return true;
    }

    stack.pop();
    return false;
  }
}

export default DagValidator;
