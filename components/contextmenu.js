import Dropdown from "./dropdown.js";

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

export default ContextMenu;
