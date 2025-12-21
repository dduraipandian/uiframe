import { EmitterComponent } from "./base.js";
import Utility from "./utils.js";
import ContextMenu from "./contextmenu.js";

function animateExpandedCollapse(container, mutateFn) {
  // Only animate if this is an expanded collapse
  if (!container.classList.contains("show")) {
    mutateFn();
    return;
  }

  // 1️⃣ Measure before
  const startHeight = container.scrollHeight;

  // 2️⃣ Mutate DOM (add children)
  mutateFn();

  // 3️⃣ Measure after
  const endHeight = container.scrollHeight;

  // 4️⃣ Animate height delta
  container.style.height = startHeight + "px";
  container.style.overflow = "hidden";

  requestAnimationFrame(() => {
    container.style.transition = "height 300ms ease";
    container.style.height = endHeight + "px";
  });

  container.addEventListener(
    "transitionend",
    () => {
      container.style.height = "";
      container.style.transition = "";
      container.style.overflow = "";
    },
    { once: true }
  );
}

/**
 * Hierarchical tree component with lazy-loading, recursive nodes, and state persistence.
 * @extends EmitterComponent
 */
class Tree extends EmitterComponent {
  /**
   * @param {Object} options
   * @param {string} options.name - Unique name for the tree instance.
   * @param {Array<Object>} [options.objects=[]] - Initial tree data.
   * @param {Object} [options.options] - Configuration options.
   * @param {Function} [options.options.data_callback] - Async/dynamic data loader for children.
   * @param {Array<Object>} [options.options.contextData] - Data for the right-click context menu.
   */
  constructor({ name, objects = [], options = {} }) {
    super({ name });
    this.options = options || {};
    this.objects = objects || [];
    this.element = null;
    this.tree = null;
    this.visited = new Set();
    this.cb = options.data_callback || null;
    this.contextMenu = null;
    this.contextMenuData = options.contextData || [];
    this.openedNodes = {};
    // Store bound event listeners for cleanup
    this.boundListeners = new Map();
  }

  /**
   * Returns the HTML structure for the tree and its context menu container.
   * @override
   * @returns {string}
   */
  html() {
    return `
            <div class="tree" id="${this.id}-tree">
            </div>
            <div id="contextMenuContainer">
            </div>
        `;
  }

  /**
   * Initializes the tree component, rendering the root nodes and setting up global listeners.
   * @override
   */
  init() {
    this.element = this.container;
    this.tree = this.element.querySelector(".tree");
    // Initial render: Root has no parent ID, so we pass empty string or unique root prefix
    this.upsert(this.tree, this.objects, "", false, "root");

    // Global listener for collapse events within this tree to track state
    // Bind handlers for proper cleanup on destroy
    const onShown = (e) => {
      e.stopPropagation(); // Prevent bubbling if nested
      // The target ID is likely "some-id-collapse", we want the node ID
      // Based on template: id="${id}-collapse" -> Node ID is ${id}
      const nodeId = e.target.id.replace("-collapse", "");
      this.trackOpened(nodeId, true);
    };

    const onHidden = (e) => {
      e.stopPropagation();
      const nodeId = e.target.id.replace("-collapse", "");
      this.trackOpened(nodeId, false);
    };

    const onContextMenu = (e) => {
      this.contextMenu.show(this, e);
    };

    // Store bound listeners for cleanup
    this.boundListeners.set("shown.bs.collapse", onShown);
    this.boundListeners.set("hidden.bs.collapse", onHidden);
    this.boundListeners.set("contextmenu", onContextMenu);

    this.tree.addEventListener("shown.bs.collapse", onShown);
    this.tree.addEventListener("hidden.bs.collapse", onHidden);

    let contextMenuContainer = this.element.querySelector("#contextMenuContainer");
    this.contextMenu = new ContextMenu({
      name: "Folder Menu",
      options: {
        maxHeight: "15em",
      },
    });
    this.contextMenu.renderInto(contextMenuContainer);
    this.contextMenu.setDropdownItems(this.contextMenuData);
    this.tree.addEventListener("contextmenu", onContextMenu);
  }

  /**
   * @param {HTMLElement} parent
   * @param {Array} children
   * @param {string} path - Data path for utility access
   * @param {boolean} update
   * @param {string} parentPathId - The deterministic ID of the parent node to ensure stable children IDs
   */
  upsert(parent, children, path = "", update = false, parentPathId = "root") {
    let count = 0;
    children.forEach((object) => {
      let dataPath = path == "" ? `${count}` : `${path}.${count}`;

      // Generate stable ID based on parent path and object name (or index if name missing)
      // Sanitize name to be safe for HTML IDs
      const safeName = (object.name || `node_${count}`).replace(/[^a-zA-Z0-9-_]/g, "-");
      const stableId = `${parentPathId}-${safeName}`;

      // Store it on object non-enumerably or just use it?
      // The plan said not to rely on object._id from data, but we can store our stableId there for runtime use if we want,
      // but the template generation needs to be deterministic.
      // Let's pass stableId to getTemplate.

      // We check if this node was previously opened
      const isExpanded = this.openedNodes[stableId];

      animateExpandedCollapse(parent, () => {
        let template = this.getTemplate(object, dataPath, stableId, isExpanded);
        parent.insertAdjacentHTML("beforeend", template);
      });

      const collapseContainerKey = `#${stableId} .children`;
      const collapseContainer = parent.querySelector(collapseContainerKey);
      const childNode = parent.querySelector(`#${stableId}`); // this childNode becomes the parent for next level

      // Bind listener for proper cleanup tracking
      const onShowCollapse = () => {
        this.upsertChild(childNode, object, update, stableId);
      };

      // Store listener reference for cleanup
      const key = `collapse-${stableId}`;
      this.boundListeners.set(key, {
        element: collapseContainer,
        event: "show.bs.collapse",
        handler: onShowCollapse,
      });

      collapseContainer.addEventListener("show.bs.collapse", onShowCollapse);

      // If it should be expanded, we might need to trigger load now if not already loaded
      if (isExpanded) {
        this.upsertChild(childNode, object, update, stableId);
      }

      count++;
    });
  }

  trackOpened(nodeId, isOpen) {
    if (isOpen) {
      this.openedNodes[nodeId] = true;
    } else {
      delete this.openedNodes[nodeId];
    }
  }

  upsertChild(parent, object, update = false, parentPathId) {
    // If parentPathId isn't passed (from legacy calls/events), try to derive or require it.
    // In our fixed event listener, we pass it.
    if (!parentPathId) {
      // Fallback: This shouldn't happen with new code, but safety check.
      parentPathId = parent.id;
    }

    const childCollapseContainerKey = `#${parent.id} .children`;
    const childCollapseContainer = parent.querySelector(childCollapseContainerKey);

    if (!childCollapseContainer) return;

    if (update) {
      // Force update logic
    } else {
      // Avoid re-loading already loaded containers when expand/collapse happens
      if (this.visited.has(childCollapseContainer.id)) {
        return;
      }
    }
    this.loadChild(childCollapseContainer, object, parentPathId);
    this.visited.add(childCollapseContainer.id);
  }

  loadChild(childContainer, object, parentPathId) {
    const uri = childContainer.dataset.uri;
    let data = Utility.deepValue(this.objects, uri);
    if (this.cb && data === undefined) {
      data = this.cb(object);
      data = Utility.deepValue(this.objects, uri, data);
    }

    // this child becomes the parent for next level
    this.upsert(childContainer, data, uri, false, parentPathId);
  }

  getTemplate(object, dataPath, id, isExpanded) {
    const pathToChildren = `${dataPath}.children`;
    // Use the passed stable ID

    // object._id = id; // Do not mutate object ID if user says it comes from API
    // If we really need to store it for some other component logic, we can, but user specifically asked to avoid relying on it for collision reasons.
    // We will just use the DOM ID.

    const name = object.name;
    const expandedClass = isExpanded ? "show" : "";
    const buttonCollapsedClass = isExpanded ? "" : "collapsed";
    const ariaExpanded = isExpanded ? "true" : "false";

    return `
        <ul class="btn-toggle-nav list-unstyled fw-normal small m-0 context-menu-container" id="${id}" data-uri="${dataPath}">
            <li class="ms-3" id="${id}-item"> 
                <button class="btn btn-toggle d-inline-flex align-items-center rounded border-0 ${buttonCollapsedClass}" 
                        data-bs-toggle="collapse" 
                        data-bs-target="#${id}-collapse" 
                        aria-expanded="${ariaExpanded}">
                    <span class="span-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" 
                            id="${id}-icon" 
                            width="16" 
                            height="16"                        
                            class="bi bi-folder-fill" 
                            viewBox="0 0 16 16">
                                <path d="M9.828 3h3.982a2 2 0 0 1 1.992 2.181l-.637 7A2 2 0 0 1 13.174 14H2.825a2 2 0 0 1-1.991-1.819l-.637-7a2 2 0 0 1 .342-1.31L.5 3a2 2 0 0 1 2-2h3.672a2 2 0 0 1 1.414.586l.828.828A2 2 0 0 0 9.828 3m-8.322.12q.322-.119.684-.12h5.396l-.707-.707A1 1 0 0 0 6.172 2H2.5a1 1 0 0 0-1 .981z"></path>
                        </svg>
                        <span id="${id}-spinner"
                            class="spinner-border spinner-border-sm d-none" 
                            role="status"></span>
                        ${name} 
                        <span id="${id}-size" class="badge bg-secondary" style="top: 0" ></span>
                    </span>
                </button>
                <div id="${id}-collapse" 
                    class="collapse children ${expandedClass}" 
                    data-source="json" 
                    data-uri="${pathToChildren}">
                </div>           
            </li>
        </ul>
        `;
  }

  /**
   * Updates a node with new data.
   * @param {HTMLElement} node - The node to update.
   * @param {Array<Object>} data - New data for the node's children.
   */
  update(node, data) {
    if (!node || !data) return;

    const uri = node.dataset.uri;
    let obj = Utility.deepValue(this.objects, uri);
    obj.children = data;

    // update needs current path ID
    const currentPathId = node.id;
    this.upsertChild(node, this.objects, true, currentPathId);
  }

  /**
   * Refreshes a node by clearing its children and re-rendering them with new data.
   * @param {HTMLElement} node - The node to refresh.
   * @param {Array<Object>} data - New data for the children.
   */
  refresh(node, data) {
    if (!node || !data) return;

    const childCollapseContainerKey = `#${node.id} .children`;
    const childCollapseContainer = node.querySelector(childCollapseContainerKey);

    // Important: we need the ID of the node being refreshed to maintain stability for its children
    const currentPathId = node.id;

    const uri = childCollapseContainer.dataset.uri;
    Utility.deleteValue(this.objects, uri);
    Utility.deepValue(this.objects, uri, data);

    animateExpandedCollapse(childCollapseContainer, () => {
      childCollapseContainer.innerHTML = "";
    });

    // This is tricky: refresh usually implies reloading children.
    // We need to clear visited state for this container's children if we are nuking them?
    // Actually animateExpandedCollapse nukes innerHTML so yes, we just re-upsert.

    // We must remove visited status for THIS container so upsertChild won't bail
    this.visited.delete(childCollapseContainer.id);

    this.upsertChild(node, this.objects, true, currentPathId);
  }

  /**
   * Removes a node from the tree and the internal data structure.
   * Cleans up associated event listeners to prevent memory leaks.
   * @param {HTMLElement} node - The node to remove.
   */
  remove(node) {
    if (!node) return;

    const nodeId = node.id;

    // Clean up opened state for this node
    delete this.openedNodes[nodeId];

    // Clean up event listeners associated with this node
    const collapseKey = `collapse-${nodeId}`;
    const listener = this.boundListeners.get(collapseKey);
    if (listener) {
      listener.element.removeEventListener(listener.event, listener.handler);
      this.boundListeners.delete(collapseKey);
    }

    // Clean up visited tracking
    const collapseContainer = node.querySelector(".children");
    if (collapseContainer) {
      this.visited.delete(collapseContainer.id);
    }

    Utility.deleteValue(this.objects, node.dataset.uri);
    node.remove();
  }
}

export default Tree;
