/**
 * Base class for all UI components in the library.
 * Provides a standardized lifecycle: constructor -> createContainer -> init -> renderInto.
 * @abstract
 */
class Component {
  /**
   * @param {Object} options
   * @param {string} options.name - The unique name of the component, used to generate the DOM ID.
   */
  constructor({ name }) {
    if (new.target === Component) {
      throw new TypeError("Cannot construct Component instances directly");
    }

    this.name = name;
    this.containerID = this.name
      ? this.name.toLowerCase().replace(/\s+/g, "-")
      : `tab-${Math.random().toString(36).substring(2, 15)}`;
    this.id = this.containerID;
    this.container = null;

    this.created = false;
    this.rendered = false;

    this.parentContainer = null;
    this.onlyChild = null;
  }

  /**
   * Renders the component into a DOM element.
   * @param {HTMLElement|string} container - The element or string ID of the container to render into.
   * @throws {Error} If the container is not found or is invalid.
   */
  renderInto(container, onlyChild = false) {
    this.onlyChild = onlyChild;
    let containerElement;
    if (this.isRendered()) {
      console.warn(`'${this.name}' component is already rendered.`);
      return;
    }

    if (typeof container === "string") {
      containerElement = document.getElementById(container);
      if (!containerElement) {
        throw new Error(`Container with id ${container} not found`);
      }
    } else if (!(container instanceof HTMLElement)) {
      throw new Error("Container must be a valid HTMLElement or a string ID.");
    } else {
      containerElement = container;
    }

    if (!containerElement.id) {
      throw new Error("Container must have a valid id.");
    }

    this.parentContainer = containerElement;
    this.createContainer();

    if (this.onlyChild) {
      this.parentContainer.replaceChildren(this.container);
    } else {
      this.parentContainer.appendChild(this.container);
    }
    console.log("DOM is rendered into container ", containerElement.id);
    this.rendered = true;
  }

  /**
   * Returns the element the component was rendered into.
   * @returns {HTMLElement|null}
   */
  getParentContainer() {
    if (!this.rendered) {
      console.warn(`'${this.name}' component is not rendered yet.`);
      return null;
    }
    return this.parentContainer;
  }

  /**
   * Creates the internal container element and initializes it.
   * @protected
   * @returns {HTMLElement}
   */
  createContainer() {
    if (this.isCreated()) {
      if (this.container) return this.container;

      console.warn(`${this.component} component is already rendered.`);
      return;
    }
    this.container = this.#createAndGetElement();
    this.initContainer();

    return this.container;
  }

  /**
   * Returns the internal container element, creating it if necessary.
   * @returns {HTMLElement}
   */
  getContainer() {
    if (!this.container) {
      this.createContainer();
    }
    return this.container;
  }

  #createAndGetElement() {
    const div = document.createElement("div");
    div.id = this.containerID;
    div.style.height = "100%";
    div.style.width = "100%";

    const template = this.html();

    div.insertAdjacentHTML("beforeend", template);
    return div;
  }

  /**
   * Initializes the component after the container is created.
   * @protected
   */
  initContainer() {
    this.init();
    this.created = true;
  }

  /**
   * Returns whether the component's internal container has been created.
   * @returns {boolean}
   */
  isCreated() {
    return this.created;
  }

  /**
   * Returns whether the component has been rendered into a parent container.
   * @returns {boolean}
   */
  isRendered() {
    return this.rendered;
  }

  /**
   * Abstract method to be implemented by subclasses for initialization logic (e.g., event listeners).
   * @abstract
   */
  init() {
    throw new Error("Method 'init()' must be implemented in the subclass");
  }

  /**
   * Abstract method to be implemented by subclasses to return the HTML template string.
   * @abstract
   * @returns {string}
   */
  html() {
    throw new Error("Method '#html()' must be implemented in the subclass");
  }
}

/**
 * Base class for components that need to emit and listen to custom events.
 * @extends Component
 */
class EmitterComponent extends Component {
  /**
   * @param {Object} options
   * @param {string} options.name - The unique name of the component.
   */
  constructor({ name }) {
    super({ name });
    this.events = {};
  }

  /**
   * Subscribes a handler function to a custom event.
   * @param {string} event - The name of the event.
   * @param {Function} handler - The callback function.
   */
  on(event, handler) {
    (this.events[event] ||= []).push(handler);
  }

  /**
   * Emits a custom event with an optional payload.
   * @param {string} event - The name of the event.
   * @param {*} [payload] - Optional data to pass to handlers.
   */
  emit(event, payload) {
    (this.events[event] || []).forEach((fn) => fn(payload));
  }

  /**
   * Unsubscribes a handler function from an event.
   * @param {string} event - The name of the event.
   * @param {Function} handler - The specific handler function to remove.
   */
  off(event, handler) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter((fn) => fn !== handler);
  }

  /**
   * Clears all handlers for a specific event, or all events if none specified.
   * @param {string} [event] - The name of the event to clear.
   */
  clear(event) {
    if (event) delete this.events[event];
    else this.events = {};
  }
}

export { EmitterComponent, Component };
