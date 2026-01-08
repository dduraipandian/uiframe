import { EmitterComponent, Utility } from '@uiframe/core';

/**
 * Searchable, animated dropdown component built on Bootstrap.
 * @extends EmitterComponent
 */
class Dropdown extends EmitterComponent {
  /**
   * @param {Object} options
   * @param {string} options.name - Display name/label for the dropdown.
   * @param {Object} [options.options] - Configuration options.
   * @param {string} [options.options.maxHeight='15em'] - CSS max-height for the item list.
   * @param {boolean} [options.options.search=false] - Enable search input within the menu.
   * @param {boolean} [options.options.contextMenu=false] - Whether this is used as a context menu (affects display).
   */
  constructor({ name, options = {} }) {
    super({ name });

    this.options = options;

    this.dropdownItemContainer = null;
    this.dropDownItemSearchContainer = null;

    this.dropDownId = `${this.id}-dropdown`;
    this.dropDownItemContainerId = `${this.id}-items`;
    this.dropDownItemSearchContainerId = `${this.id}-search-container`;
    this.loaderId = `${this.id}-loader`;
    this.searchId = `${this.id}-search`;

    this.maxHeight = options.maxHeight || "15em";
    this.enableSearch = options.search || false;
    this.isContextMenu = options.contextMenu || false;

    this.itemsCount = 0;
    this.firstClick = true;

    this.itemTransitionWindow = 10;

    this.createContainer();
  }

  /**
   * Returns the HTML structure for the dropdown and its search input.
   * @override
   * @returns {string}
   */
  html() {
    let searchTemplate = "";
    if (this.enableSearch) {
      searchTemplate = `
                <div id="${this.searchId}">
                    <input type="text" 
                        class="form-control form-control-sm search-input border-0 rounded-0 rounded-top shadow-none border-bottom search-input" 
                        id="${this.id}-search" 
                        placeholder="Search...">
                </div>
            `;
    }
    let hide = "";
    let staticDisplay = "";
    let displayEnd = "dropdown-menu-end";
    if (this.isContextMenu) {
      hide = "d-none";
      staticDisplay = 'data-bs-display="static"';
      displayEnd = "";
    }
    const template = `
            <div class="uiframe-dropdown dropdown" id="${this.dropDownId}">
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-secondary dropdown-title ${hide}" type="button">${this.name}</button>
                    <button type="button" 
                            id="${this.dropDownId}-toggle"
                            class="btn btn-secondary dropdown-toggle dropdown-toggle-split ${hide}"
                            data-bs-animation="true" 
                            data-bs-delay='{"show":0,"hide":150}'
                            data-bs-toggle="dropdown"
                            ${staticDisplay}
                            aria-expanded="false">
                        <span class="visually-hidden">Toggle Dropdown</span>
                    </button>
                    <ul id="${this.dropDownId}-menu" class="dropdown-menu ${displayEnd}"
                        style="padding: 0;">
                        <li id="${this.loaderId}" style="height: 100px;">
                            <div class="d-flex justify-content-center mt-5 pt-2">
                                <div class="spinner-grow spinner-grow-sm" role="status"></div>
                            </div>
                        </li>
                        <div id="${this.dropDownItemSearchContainerId}" style="display: none;">
                            ${searchTemplate}
                            <div id="${this.dropDownItemContainerId}"
                                style="max-height: ${this.maxHeight}; overflow-y: auto;"
                                class="scrollbar"></div>
                        </div>
                    </ul>
                </div>
            </div>`;
    return template;
  }

  display(element, show = true, transition = false) {
    if (element) {
      if (show) {
        element.style.display = "block";
        if (transition) {
          element.style.transition = "opacity .25s ease-in-out";
          setTimeout(() => {
            element.style.opacity = "100";
          }, 500);
        } else {
          element.style.opacity = "100";
        }
      } else {
        element.style.opacity = "0";
        if (transition) {
          element.style.transition = "opacity .25s ease-in-out";
          setTimeout(() => {
            element.style.display = "none";
          }, 500);
        } else {
          element.style.display = "none";
        }
      }
    }
  }

  /**
   * Populates the dropdown with a list of items.
   * @param {Array<Object>} items - Array of {name, value} objects.
   */
  setDropdownItems(items) {
    this.clear(this.dropdownItemContainer);

    if (this.dropdownItemContainer) {
      items.forEach((item) => this.addDropdownItem(item));
      this.displayDropDownItems(true);
    }
  }

  displayDropDownItems(show = true) {
    const loader = this.element.querySelector(`#${this.loaderId}`);
    this.display(loader, !show);
    this.display(this.dropDownItemSearchContainer, show);
  }

  addDropdownItem(item) {
    if (!this.dropdownItemContainer) {
      return;
    }

    const itemElement = document.createElement("li");
    if (!item || !item.name) {
      const hr = document.createElement("hr");
      hr.classList.add("dropdown-divider", "mb-1", "mt-1");
      itemElement.appendChild(hr);
      this.dropdownItemContainer.appendChild(itemElement);
      return;
    }
    this.itemsCount += 1;

    const link = document.createElement("a");
    link.classList.add("dropdown-item", "hide", "pointer");
    link.innerHTML = `${item.name}`;
    link.dataset.name = item.name;
    link.dataset.value = item.value;
    link.dataset.index = this.itemsCount;

    link.addEventListener("click", this.itemOnClick.bind(this, link, item));

    itemElement.appendChild(link);
    this.dropdownItemContainer.appendChild(itemElement);

    this.itemTransition(link, true);
  }

  /**
   * Initializes the dropdown component and sets up observers and animations.
   * @override
   */
  init() {
    this.element = this.container.querySelector(`#${this.dropDownId}`);
    this.dropdownItemContainer = this.element.querySelector(`#${this.dropDownItemContainerId}`);
    this.dropDownItemSearchContainer = this.element.querySelector(
      `#${this.dropDownItemSearchContainerId}`
    );

    this.#searchListener();
    this.#animateDropDown();
  }

  #animateDropDown() {
    console.log("Animation added");
    const dropDown = this.element;

    dropDown.addEventListener("show.bs.dropdown", () => {
      if (this.firstClick) {
        this.firstSelection();
      }
      this.displayAnimatedItems(true);
    });
    dropDown.addEventListener("hide.bs.dropdown", () => this.displayAnimatedItems(false));
  }

  #searchListener() {
    if (!this.enableSearch) return;

    const debouncedHandleSearch = Utility.debounce(this.handleSearch.bind(this), 100);

    const searchInput = this.element.querySelector(`#${this.searchId} input`);
    if (searchInput) {
      searchInput.addEventListener("input", (event) => debouncedHandleSearch(event.target.value));
    }
  }

  /**
   * Filters items based on search term.
   * @param {string} value - The search term.
   */
  handleSearch(value) {
    const searchTerm = value.toLowerCase();
    const dropDownItems = this.element.querySelectorAll(
      `#${this.dropDownItemContainerId} .dropdown-item`
    );
    dropDownItems.forEach((link) => {
      const itemName = link.dataset.name.toLowerCase();
      const display = itemName.includes(searchTerm);
      this.display(link, display);
    });
  }

  itemOnClick(link, item) {
    this.emit("item:click", item);
    this.dropdownItemContainer.querySelectorAll(".dropdown-item").forEach((item) => {
      item.classList.remove("active");
    });
    this.element.querySelector(".dropdown-title").textContent = item.name;
    link.classList.add("active");
  }
  firstSelection() {
    this.emit("init", null);
    this.firstClick = false;
  }

  displayAnimatedItems(show = true) {
    const dropDownItems = this.element.querySelectorAll(
      `#${this.dropDownItemContainerId} .dropdown-item`
    );
    dropDownItems.forEach((link) => this.itemTransition(link, show));
  }

  itemTransition(link, show) {
    setTimeout(() => {
      show ? link.classList.add("show") : link.classList.remove("show");
    }, this.itemTransitionWindow * link.dataset.index);
  }
}

/**
 * Specialized Dropdown used as a right-click context menu.
 * Automatically positions itself at the pointer coordinates.
 * @extends Dropdown
 */
class ContextMenu extends Dropdown {
  /**
   * @param {Object} options
   * @param {string} options.name - Unique name for the context menu.
   * @param {Object} [options.options] - Configuration options passed to Dropdown.
   */
  constructor({ name, options = {} }) {
    options.contextMenu = true;
    super({ name, options });
    this.menu = null;
    this.dropdown = null;
    this.currentNode = null;
    this.context = null;
  }

  /**
   * Initializes the context menu and global auto-hide listeners.
   * @override
   */
  init() {
    super.init();
    this.element = this.container;
    this.dropDownButton = this.element.querySelector(`#${this.dropDownId}-toggle`);
    setTimeout(() => {
      // Context Menu position is handled by this class. so need to disable popper handling
      // positioning of the dropdown.
      this.dropdown = new bootstrap.Dropdown(this.dropDownButton, {
        popperConfig: null,
      });
      // Hide on click elsewhere
      document.addEventListener("click", () => {
        this.hide();
      });
      document.addEventListener("scroll", () => {
        this.hide();
      });
      this.menu = this.element.querySelector(`#${this.dropDownId}-menu`);
    }, 1000);
  }

  /**
   * Shows the context menu at the provided pointer event coordinates.
   * @param {Object} context - The data context for the menu actions.
   * @param {PointerEvent} event - The click event triggering the menu.
   */
  show(context, event) {
    event.preventDefault();
    let container = event.target;

    // Context menu should be associated only with context container.
    // It should not be associated with child elements.
    while (container && !container.classList.contains("context-menu-container")) {
      container = container.parentElement;
    }
    if (!container) {
      return;
    }

    const x = event.clientX;
    const y = event.clientY;

    // 1️⃣ force reset bootstrap state
    this.hide();

    // 2️⃣ set position
    this.menu.style.left = x + "px";
    this.menu.style.top = y + "px";
    this.menu.style.position = "fixed";

    // 3️⃣ wait for layout + bootstrap cleanup
    requestAnimationFrame(() => {
      this.dropdown.show();
    });
    this.currentNode = container;
    this.context = context;
  }

  /**
   * Hides the context menu.
   */
  hide() {
    this.dropdown.hide();

    // resets context
    this.currentNode = null;
    this.context = null;
  }

  itemOnClick(link, item) {
    if (item.callback) {
      item.callback(this.context, this.currentNode);
      return;
    }
    // Emit standard event via parent
    super.itemOnClick(link, item);
  }
}

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
            <div class="uiframe-tree" id="${this.id}-tree">
            </div>
            <div class="uiframe-tree-cm" id="contextMenuContainer">
            </div>
        `;
  }

  /**
   * Initializes the tree component, rendering the root nodes and setting up global listeners.
   * @override
   */
  init() {
    this.element = this.container;
    this.tree = this.element.querySelector(".uiframe-tree");
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

    if (update) ; else {
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

export { Tree };
//# sourceMappingURL=index.esm.js.map
