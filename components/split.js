/**
 * Component for creating resizable split-pane layouts (Top/Bottom).
 */
class SplitPane {
  /**
   * @param {Object} options
   * @param {string} options.containerID - The ID of the existing DOM element to inject the split pane into.
   * @param {HTMLElement} options.top - The content element for the top pane.
   * @param {HTMLElement} options.bottom - The content element for the bottom pane.
   * @param {Object} [options.options] - Configuration options.
   * @param {number} [options.options.min_size=60] - Minimum height in px for each pane.
   * @param {number} [options.options.min_top=130] - Minimum height in px for the top pane.
   * @param {string} [options.options.topHeight='49.9%'] - Initial height of the top pane (CSS value).
   * @param {string} [options.options.bottomHeight='49.9%'] - Initial height of the bottom pane (CSS value).
   */
  constructor({ containerID, top, bottom, options = {} }) {
    this.containerID = containerID; // id of the container div
    this.topContainer = top;
    this.bottomContainer = bottom;

    this.dragging = false;

    // min sizes in px for each pane
    this.MIN_SIZE_PX = options.min_size || 60;
    this.MIN_TOP = options.min_top || 130;

    this.topContainerHeight = options.topHeight || "49.9%"; // initial height of top container
    this.bottomContainerHeight = options.bottomHeight || "49.9%"; // initial height of bottom container

    // ensure elements exist
    this.container = document.getElementById(this.containerID);

    this.splitContainerID = `uiframe-${this.containerID}-split-container`;
    this.topContainerID = `uiframe-${this.containerID}-split-top`;
    this.bottomContainerID = `uiframe-${this.containerID}-split-bottom`;
    this.dividerContainerID = `uiframe-${this.containerID}-split-divider`; // id of the divider
  }

  /**
   * Renders the split pane into the container and initializes interactivity.
   */
  render() {
    const innerHTML = this.#html();
    this.container.insertAdjacentHTML("beforeend", innerHTML);
    this.container.querySelector(`#${this.topContainerID}`).appendChild(this.topContainer);
    this.container.querySelector(`#${this.bottomContainerID}`).appendChild(this.bottomContainer);
    this.init();
  }

  #html() {
    return `
            <div id="${this.splitContainerID}" 
                class="uiframe-split-container d-flex flex-column" 
                style="height: 100%; width: 100%; position: relative; overflow: hidden;">
                <div id="${this.topContainerID}" 
                    class="split-pane" style="height: ${this.topContainerHeight}; overflow: auto;"></div>
                <div id="${this.dividerContainerID}" 
                    class="split-divider text-center"
                    role="separator" 
                    aria-orientation="vertical" 
                    aria-label="Resize panels">
                    <svg xmlns="http://www.w3.org/2000/svg" 
                        id="${this.dividerContainerID}-icon" 
                        width="24" height="24" fill="currentColor" class="bi bi-grip-horizontal split-divider-icon" 
                        viewBox="0 0 16 16">
                        <path d="M2 8a1 1 0 1 1 0 2 1 1 0 0 1 0-2m0-3a1 1 0 1 1 0 2 1 1 0 0 1 0-2m3 3a1 1 0 1 1 0 2 1 1 0 0 1 0-2m0-3a1 1 0 1 1 0 2 1 1 0 0 1 0-2m3 3a1 1 0 1 1 0 2 1 1 0 0 1 0-2m0-3a1 1 0 1 1 0 2 1 1 0 0 1 0-2m3 3a1 1 0 1 1 0 2 1 1 0 0 1 0-2m0-3a1 1 0 1 1 0 2 1 1 0 0 1 0-2m3 3a1 1 0 1 1 0 2 1 1 0 0 1 0-2m0-3a1 1 0 1 1 0 2 1 1 0 0 1 0-2"/>
                    </svg>
                </div>
                <div id="${this.bottomContainerID}" 
                    class="split-pane" style="height: ${this.bottomContainerHeight};"></div>
            </div>
        `;
  }

  /**
   * Initializes pointer events for resizing.
   */
  init() {
    // ensure elements exist
    const container = this.container.querySelector(`#${this.splitContainerID}`);
    const top = document.getElementById(this.topContainerID);
    const bottom = document.getElementById(this.bottomContainerID);
    const divider = document.getElementById(this.dividerContainerID);

    let dragging = this.dragging;

    // min heights in px for each pane
    const MIN_TOP = this.MIN_TOP;
    const MIN_BOTTOM = this.MIN_SIZE_PX;

    // helpers
    function clamp(val, min, max) {
      return Math.max(min, Math.min(max, val));
    }

    function onPointerDown(e) {
      e.preventDefault();
      dragging = true;
      document.body.classList.add("no-select");
    }

    function getY(event) {
      if (event.touches) return event.touches[0].clientY;
      return event.clientY;
    }

    function onPointerMove(e) {
      if (!dragging) return;
      const clientY = getY(e);
      const rect = container.getBoundingClientRect();
      // compute new top height (px)
      let newTopH = clientY - rect.top;
      // clamp top height so bottom atleast MIN_BOTTOM and top atleast MIN_TOP
      const maxTop = rect.height - MIN_BOTTOM - divider.offsetHeight;
      newTopH = clamp(newTopH, MIN_TOP, maxTop);

      // set explicit heights (px)
      top.style.height = newTopH + "px";
      // bottom will fill remaining due to flex layout, ensure it doesn't go below min
      bottom.style.height = rect.height - newTopH - divider.offsetHeight + "px";
    }

    function onPointerUp() {
      if (!dragging) return;
      dragging = false;
      document.body.classList.remove("no-select");
    }

    // Optional: remember last size in localStorage
    function saveSize() {
      const rect = container.getBoundingClientRect();
      const topHeight = top.getBoundingClientRect().height;
      const ratio = topHeight / rect.height;
      localStorage.setItem("splitTopRatio", ratio.toString());
    }

    function loadSize() {
      const r = parseFloat(localStorage.getItem("splitTopRatio"));
      if (!isNaN(r) && r > 0 && r < 1) {
        const rect = container.getBoundingClientRect();
        const h = Math.round(rect.height * r);
        top.style.height = h + "px";
        bottom.style.height = rect.height - h - divider.offsetHeight + "px";
      }
    }

    // Mouse events
    divider.addEventListener("mousedown", onPointerDown);
    window.addEventListener("mousemove", onPointerMove);
    window.addEventListener("mouseup", onPointerUp);

    // Touch events
    divider.addEventListener("touchstart", onPointerDown, { passive: false });
    window.addEventListener("touchmove", onPointerMove, { passive: false });
    window.addEventListener("touchend", onPointerUp);

    // save on release
    window.addEventListener("mouseup", saveSize);
    window.addEventListener("touchend", saveSize);
    // set initial size after load (slightly delayed so container has size)
    window.addEventListener("load", () => setTimeout(loadSize, 50));
  }
}

export default SplitPane;
