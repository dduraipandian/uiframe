import { EmitterComponent } from '@uiframe/core';

class Notification extends EmitterComponent {
  constructor({ name, options = {} }) {
    super({ name });

    this.options = options;
    this.autoHideOnError = options.autohide_on_error || undefined;

    this.INFO = "info";
    this.SUCCESS = "success";
    this.ERROR = "error";
    this.WARNING = "warning";

    this.disapearAfter = options.disappear_after || 3000;
    this.notificationContainer = null;
    this.querySelector = "#uiframe-notification-container .toast-container";
    this.createNotificationContainer();
  }

  createNotificationContainer() {
    const container = document.querySelector(this.querySelector);
    if (!container) {
      const notificationContainerHtml = `
        <div id="uiframe-notification-container" aria-live="polite" aria-atomic="true" class="uiframe-notification-container position-relative">
            <div class="toast-container bottom-0 end-0"></div>
        </div>
      `;
      document.body.insertAdjacentHTML("beforeend", notificationContainerHtml);
    }

    this.notificationContainer = container ?? document.querySelector(this.querySelector);

    console.log(this.notificationContainer);
    this.#getDiv(this.INFO);
    this.#getDiv(this.SUCCESS);
    this.#getDiv(this.ERROR);
    this.#getDiv(this.WARNING);
  }

  #getDiv(level) {
    const htm = this.html(level);
    this.notificationContainer.insertAdjacentHTML("beforeend", htm);
  }

  #errorModal() {
    return `
      <div class="modal fade" id="${this.id}-errorNotificationModal" 
          data-bs-backdrop="static" 
          data-bs-keyboard="false" 
          tabindex="-1" 
          aria-labelledby="${this.id}-errorNotificationModalTitle" 
          aria-hidden="true">
          <div class="modal-dialog modal-dialog-centered">
              <div class="modal-content" style="max-width: 650px; width: 650px">
                  <div class="modal-header">
                      <h1 class="modal-title fs-5" id="${this.id}-errorNotificationModalTitle"></h1>
                      <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                  </div>
                  <div class="modal-body">
                      <pre id="${this.id}-errorNotificationModalMessage"></pre>
                  </div>
                  <div class="modal-footer">
                      <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                  </div>
              </div>
          </div>
      </div>
    `;
  }

  html(level) {
    let bgClass = "bg-info text-dark";
    let autoHide = true;
    let modalHtml = "";

    if (level === "success") {
      bgClass = "bg-success text-white";
    } else if (level === "error") {
      bgClass = "bg-danger text-white";
      modalHtml = this.#errorModal();
      autoHide = this.autoHideOnError === undefined ? false : this.autoHideOnError;
    } else if (level === "warning") {
      bgClass = "bg-warning text-dark";
    }

    return `
            ${modalHtml}            
            <div id="${this.id}-notification-${level}" 
                class="toast align-items-center ${bgClass}" 
                role="alert"
                aria-live="assertive"
                data-bs-autohide="${autoHide}"
                aria-atomic="true" 
                data-bs-delay="${this.disapearAfter}">
                <div class="d-flex">
                    <div id="${this.id}-toast-body-${level}" class="toast-body"></div>
                    <button type="button" 
                        class="btn-close btn-close-white me-2 m-auto" 
                        data-bs-dismiss="toast" 
                        aria-label="Close">
                    </button>
                </div>
            </div>`;
  }

  #showToast(message, level = "info") {
    console.debug("Showing toast message:", message);

    let toastElement = document.getElementById(`${this.id}-notification-${level}`);
    const toastBody = document.getElementById(`${this.id}-toast-body-${level}`);
    toastBody.innerHTML = message;

    const toastBootstrap = bootstrap.Toast.getOrCreateInstance(toastElement);
    toastBootstrap.show();
  }

  #showErrorModal(title, message) {
    console.error("Showing error modal:", message);
    const modalTitle = document.getElementById(`${this.id}-errorNotificationModalTitle`);
    const modalBody = document.getElementById(`${this.id}-errorNotificationModalMessage`);

    const toastBody = document.getElementById(`${this.id}-toast-body-error`);

    toastBody.innerHTML += `
            <span type="button"
                data-bs-toggle="modal"       
                data-bs-target="#${this.id}-errorNotificationModal"> 
                    <u>show</u>
            </span>`;

    modalTitle.innerHTML = title;
    modalBody.innerHTML = message === "string" ? message : JSON.stringify(message, null, 2);
  }

  error(message, title, details) {
    console.error("Error toast:", message);
    this.#showToast(message, this.ERROR);

    if (title && details) {
      this.#showErrorModal(title, details);
    }
  }

  success(message) {
    console.debug("Success toast:", message);
    this.#showToast(message, this.SUCCESS);
  }
  info(message) {
    console.debug("Info toast:", message);
    this.#showToast(message, this.INFO);
  }
  warning(message) {
    console.debug("Warning toast:", message);
    this.#showToast(message, this.WARNING);
  }
}

/**
 * Component for monitoring and displaying network status (Online/Offline).
 * Can also trigger Bootstrap Toast notifications on status change.
 * @extends EmitterComponent
 */
class Online extends EmitterComponent {
  /**
   * @param {Object} options
   * @param {string} options.name - Unique name for the component.
   * @param {Object} [options.options] - Configuration options.
   * @param {boolean} [options.options.notify=true] - Whether to show Toast notifications.
   * @param {string} [options.options.online_notification_text] - Toast text when online.
   * @param {string} [options.options.offline_notification_text] - Toast text when offline.
   * @param {string} [options.options.online_text] - Display text for online status.
   * @param {string} [options.options.offline_text] - Display text for offline status.
   * @param {number} [options.options.disapear_after=3000] - Toast visibility duration in ms.
   */
  constructor({ name, options = {} }) {
    super({ name });
    this.options = options || {};

    this.notify = options.notify || true;
    this.onlineNotificationText = options.online_notification_text || "You are online.";
    this.offlineNotificationText = options.offline_notification_text || "You are offline.";
    this.onlineText = options.online_text || "Online.";
    this.offlineText = options.offline_text || "Offline.";
    this.disapearAfter = options.disapear_after || 3000;
    this.notificationContainerId = this.containerID + "-online-container";
    this.notificationBodyId = `${this.notificationContainerId}-body`;

    this.notificationInstance = null;
    this.element = null;
  }

  /**
   * Checks if the browser is currently online.
   * @returns {boolean}
   */
  isOnline() {
    return navigator.onLine;
  }

  /**
   * Returns the HTML status indicator (SVG + text).
   * @override
   * @returns {string}
   */
  html() {
    const status = this.isOnline();
    let statusColor = status ? "green" : "red";
    let statusTemplate = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="${statusColor}" class="bi bi-circle-fill" viewBox="0 0 16 16">
                <circle cx="8" cy="8" r="3.5"/>
            </svg>`;
    const statusText = status ? this.onlineText : this.offlineText;
    return `${statusTemplate}${statusText}`;
  }

  /**
   * Initializes the online component and sets up network event listeners.
   * @override
   */
  init() {
    this.element = this.container;

    if (this.notify) {
      this.notificationInstance = new Notification({
        name: this.name + "-toast",
        options: {
          autohide_on_error: true,
          disappear_after: this.disapearAfter,
        },
      });
    }
    window.addEventListener("online", this.updateStatus.bind(this));
    window.addEventListener("offline", this.updateStatus.bind(this));
  }

  /**
   * Updates the status display and triggers notifications on change.
   */
  updateStatus() {
    const status = this.isOnline();
    if (this.notificationInstance && this.isCreated()) {
      if (status) {
        this.notificationInstance.success(this.onlineNotificationText);
      } else {
        this.notificationInstance.error(this.offlineNotificationText);
      }
    }
    this.element.innerHTML = this.html();
  }
}

export { Online };
