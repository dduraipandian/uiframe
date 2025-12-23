import { EmitterComponent } from "./base.js";

/**
 * Component for displaying a loading spinner/overlay.
 * @extends EmitterComponent
 */
class Spinner extends EmitterComponent {
  /**
   * @param {Object} options
   * @param {string} options.name - Unique name for the spinner instance.
   * @param {Object} [options.options] - Configuration options.
   * @param {string} [options.options.spinnerColor="text-secondary"] - Bootstrap text color class for the spinner.
   * @param {boolean} [options.options.enabledCancel=false] - Whether to show a cancel button.
   * @param {string} [options.options.spinnerType="border"] - Spinner type ('border' or 'grow').
   * @param {string} [options.options.loadingText='Loading'] - Initial loading text.
   */
  constructor({ name, options = {} }) {
    super({ name });

    this.options = options;

    this.spinnerColor = options.spinnerColor || "text-secondary";
    this.enabledCancel = options.enabledCancel || false;
    this.spinnerType = options.spinnerType || "border";
    this.cancelId = `uiframe-${this.containerId}-${this.id}-cancel`;
    this.spinnerTextId = `uiframe-${this.id}-spinner-text`;
    this.cancelEventId = `spinner:${this.containerId}:${this.id}:cancel`;
    this.loadingText = options.loadingText || "Loading";

    this.element = null;
    this.intervalId = null;

    this.spinnerBorder = "spinner-border spinner-border-sm";
    this.spinnerGrow = "spinner-grow spinner-grow-sm";

    this.createContainer();
  }

  /**
   * Returns the HTML template for the spinner.
   * @override
   * @returns {string}
   */
  html() {
    let progressHTML = "";
    let cancelHTML = "";

    const spinnerType = this.spinnerType == "grow" ? this.spinnerGrow : this.spinnerBorder;

    if (this.loadingText) {
      progressHTML = `<span id="${this.spinnerTextId}" 
                          class="uiframe-spinner-text mt-2"
                          style="min-width: 100px">
                          ${this.loadingText}
                      </span>`;
    }
    if (this.enabledCancel) {
      cancelHTML = `<button id="${this.cancelId}"
                        class="uiframe-spinner-cancel-button btn btn-sm btn-outline-secondary">
                      Cancel
                    </button>`;
    }

    return `
            <div id="${this.id}-container"
                class="uiframe-spinner-container"
                style="position: absolute; pointer-events: visible !important; width: 100%">
                    <div id="${this.id}-spinner"                         
                        class="uiframe-spinner d-flex flex-column align-items-center justify-content-center">
                    <div class="${spinnerType} ${this.spinnerColor}" 
                        style="position: relative;"
                        role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    ${progressHTML}
                    ${cancelHTML}
                    </div>
            </div>`;
  }

  /**
   * Initializes the spinner component and sets up the cancel button listener if enabled.
   * @override
   */
  init() {
    // Attach any necessary event listeners here
    // For example, you might want to handle the cancel button click

    this.element = this.container;
    this.element.style.position = "absolute";
    this.element.style.display = "none";
    this.element.style.top = "40%";
    this.element.style.width = "100%";

    if (this.enabledCancel) {
      const cancelButton = this.element.querySelector(`#${this.cancelId}`);
      if (cancelButton) {
        cancelButton.addEventListener("click", this.#cancel.bind(this));
      }
    }
  }

  #cancel() {
    // Implement the logic to handle cancellation
    this.hide();
    console.debug(`Cancellation requested for spinner with id: ${this.id}`);
    const customEvent = new CustomEvent(this.cancelEventId, {
      detail: {
        id: this.id,
        topic: this.topic,
      },
      bubbles: true,
    });
    this.element.dispatchEvent(customEvent);
  }

  /**
   * Shows the spinner and optionally updates the loading text.
   * @param {string} [loadingText=null] - Optional new text to display.
   * @param {boolean} [textDotChange=false] - Whether to animate the text with trailing dots.
   */
  show(loadingText = null, textDotChange = false) {
    loadingText = loadingText || this.loadingText;

    this.element.style.display = "block";
    this.enableParentContainer(false);
    this.setLoadingProgress(loadingText, textDotChange);
  }

  /**
   * Sets the loading progress text and starts the dot animation if requested.
   * @param {string} loadingText - The text to display.
   * @param {boolean} textDotChange - Whether to animate dots.
   */
  setLoadingProgress(loadingText, textDotChange) {
    this.count = 1;
    let originalText = loadingText;
    const loadingTextElement = this.element.querySelector(`#${this.spinnerTextId}`);
    if (loadingTextElement) {
      loadingTextElement.textContent = loadingText;
      if (textDotChange) {
        this.intervalId = setInterval(() => {
          this.count = (this.count % 4) + 1;
          if (this.count === 1) {
            loadingText = originalText;
          } else {
            loadingText += ".";
          }
          loadingTextElement.textContent = loadingText;
        }, 500);
      }
    }
  }

  /**
   * Hides the spinner and clears any active animations.
   */
  hide() {
    this.element.style.display = "none";
    this.enableParentContainer(true);
    if (this.intervalId) clearInterval(this.intervalId);
  }

  enableParentContainer(enable = true) {
    const containerClasses = this.getParentContainer()?.classList;
    if (containerClasses) {
      enable ? containerClasses.remove("disabled") : containerClasses.add("disabled");
    }
  }
}

export default Spinner;
