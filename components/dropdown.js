import { EmitterComponent } from "./base.js";
import Utility from "./utils.js";

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

export default Dropdown;
