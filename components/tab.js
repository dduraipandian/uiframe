import { EmitterComponent } from "./base.js";

/**
 * Component for managing multiple tabs and their content containers.
 * @extends EmitterComponent
 */
class Tab extends EmitterComponent {
  /**
   * @param {Object} options
   * @param {string} options.name - Unique name for the tab container.
   * @param {Object} [options.options] - Configuration options.
   * @param {Array<Object>} [options.options.tabs=[]] - Initial array of tab objects {id, title, content}.
   * @param {string} [options.options.activeTab] - ID of the tab to be active on load.
   */
  constructor({ name, options = {} }) {
    super({ name });

    this.options = options;

    this.tabListId = `uiframe-${this.containerID}-tab-list`;
    this.tabContentId = `uiframe-${this.containerID}-tab-content`;

    this.tabs = options.tabs || [];
    this.activeTab = options.activeTab || (this.tabs.length > 0 ? this.tabs[0].id : null);

    this.tabListContainer = null;
    this.tabContentContainer = null;

    this.createContainer();
  }

  /**
   * Returns the HTML structure for the tab navigation and content panes.
   * @override
   * @returns {string}
   */
  html() {
    const tabHeaders = this.tabs.map((tab) => this.newTabListHtml(tab)).join("");

    return `
            <nav class="uiframe-tab">
                <div class="nav nav-tabs" id="${this.tabListId}" role="tablist">
                    ${tabHeaders}
                </div>
            </nav>
            <div class="uiframe-tab-content" id="${this.tabContentId}" style="height: calc(100% - 40px); overflow: auto;">
                ${this.tabs.map((tab) => this.newTabContentHtml(tab)).join("")}
            </div>
        `;
  }

  /**
   * Initializes the tab component and populates initial tab contents.
   * @override
   */
  init() {
    this.tabListContainer = this.container.querySelector(`#${this.tabListId}`);
    this.tabContentContainer = this.container.querySelector(`#${this.tabContentId}`);

    // Populate initial tabs content
    this.tabs.forEach((tab) => {
      const container = this.tabContentContainer.querySelector(`#${tab.id}-content`);
      if (container) {
        this.populateTabContent(tab, container);
      }
    });
  }

  /**
   * Dynamically adds a new tab to the container.
   * @param {Object} tab - The tab object.
   * @param {string} tab.id - Unique ID for the tab.
   * @param {string} tab.title - Display title for the tab.
   * @param {string|HTMLElement|EmitterComponent} tab.content - Content to render.
   */
  addTab(tab) {
    this.tabs.push(tab);
    const newTabHeaderTemplate = this.newTabListHtml(tab);
    const newTabContentTemplate = this.newTabContentHtml(tab);

    this.tabListContainer.insertAdjacentHTML("beforeend", newTabHeaderTemplate);
    this.tabContentContainer.insertAdjacentHTML("beforeend", newTabContentTemplate);

    const container = this.tabContentContainer.querySelector(`#${tab.id}-content`);
    this.populateTabContent(tab, container);
  }

  populateTabContent(tab, container) {
    if (!container || !tab.content) return;

    if (typeof tab.content === "string") {
      container.innerHTML = tab.content;
    } else if (tab.content instanceof EmitterComponent) {
      const element = tab.content.getContainer();
      container.appendChild(element);
    } else if (tab.content) {
      container.appendChild(tab.content);
    }
  }

  newTabListHtml(tab) {
    const isActive = tab.id === this.activeTab ? "active" : "";
    return `
                <button class="nav-link ${isActive} rounded-0" 
                    id="${tab.id}-tab" 
                    aria-controls="${tab.id}-content" 
                    role="tab" 
                    data-bs-toggle="tab" 
                    data-bs-target="#${tab.id}-content">
                    ${tab.title}
                </button>
            `;
  }

  newTabContentHtml(tab) {
    const isActive = tab.id === this.activeTab ? "show active" : "";
    return `
            <div class="tab-pane fade ${isActive}" 
                id="${tab.id}-content" 
                style="height: 100%; width: 100%; overflow: auto;"
                role="tabpanel" 
                aria-labelledby="${tab.id}-tab">
            </div>
        `;
  }
}

export default Tab;
