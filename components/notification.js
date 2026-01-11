import { EmitterComponent } from "@uiframe/core";

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

export { Notification };
