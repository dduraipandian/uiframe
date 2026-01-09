'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var core = require('@uiframe/core');

/**
 * Component for monitoring and displaying network status (Online/Offline).
 * Can also trigger Bootstrap Toast notifications on status change.
 * @extends EmitterComponent
 */
class Online extends core.EmitterComponent {
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
      let notificationTemplate = `
            <div class="toast-container position-fixed bottom-0 end-0 p-3 me-2 mb-3">
                <div id="${this.notificationContainerId}" 
                    class="toast align-items-center alert alert-info p-0" 
                    role="alert" 
                    aria-live="assertive"
                    aria-atomic="true" 
                    data-bs-delay="${this.disapearAfter}">
                    <div class="d-flex">
                        <div id="${this.notificationBodyId}" class="toast-body text-white"></div>
                        <button type="button" 
                            class="btn-close btn-close-white me-2 m-auto"
                            data-bs-dismiss="toast" 
                            aria-label="Close">
                        </button>
                    </div>
                </div>
            </div>`;
      const div = document.createElement("div");
      div.insertAdjacentHTML("beforeend", notificationTemplate);
      document.body.appendChild(div);
    }
    window.addEventListener("online", this.updateStatus.bind(this));
    window.addEventListener("offline", this.updateStatus.bind(this));
  }

  /**
   * Updates the status display and triggers notifications on change.
   */
  updateStatus() {
    const status = this.isOnline();
    if (this.notify && this.isCreated()) {
      document.getElementById(this.notificationBodyId).innerHTML = status
        ? this.onlineNotificationText
        : this.offlineNotificationText;
      const toast = document.getElementById(this.notificationContainerId);
      toast.classList.remove("bg-success", "bg-danger");
      toast.classList.add(status ? "bg-success" : "bg-danger");
      const toastBootstrap = bootstrap.Toast.getOrCreateInstance(toast);
      toastBootstrap.show();
    }
    this.element.innerHTML = this.html();
  }
}

exports.Online = Online;
