import { EmitterComponent } from "./base.js";
import Utility from "./utils.js";

/**
 * Feature-rich data grid component with search, pagination, and export capabilities.
 * @extends EmitterComponent
 */
class Table extends EmitterComponent {
  /**
   * @param {Object} options
   * @param {string} options.name - Unique name for the table instance.
   * @param {Object} [options.options] - Configuration options.
   * @param {boolean} [options.options.search=true] - Enable/disable search toolbar.
   * @param {boolean} [options.options.export=true] - Enable/disable data export (JSON/CSV).
   * @param {boolean} [options.options.pagination=true] - Enable/disable pagination.
   * @param {number} [options.options.pageSize=25] - Rows per page.
   * @param {Array<string>} [options.options.fields=[]] - Specific fields to display/sort.
   * @param {string} [options.options.height='460'] - Initial height of the table body.
   * @param {Object} [options.options.link] - Link configuration for row identifiers.
   * @param {string} [options.options.classNames=""] - Additional CSS classes for the table.
   */
  constructor({ name, options = {} }) {
    super({ name });

    this.tableContainerId = `${this.containerID}-container`;
    this.tableId = `${this.containerID}-table`;
    this.tableHeaderId = `${this.tableId}-table-header`;
    this.tableBodyId = `${this.tableId}-table-body`;
    this.tableCountSizeId = `${this.tableId}-table-size`;

    this.table = null;
    this.tableHeader = null;
    this.tableBody = null;

    this.columns = [];
    this.data = [];

    this.enableSearch = options.search || true;
    this.enableExport = options.export || true;
    this.enablePagination = options.pagination || false;
    this.pageSize = options.pageSize || 25;
    this.fields = options.fields || [];

    this.height = options.height || "460";

    this.linkConfig = options.link || {};
    this.classNames = options.classNames || "";
    this.enablePagination = options.pagination || true;

    this.paginationHeight = this.enablePagination ? "40px" : "10px";
    this.toolbarHeight = "50px";

    this.containerPadding = this.enablePagination ? "" : "padding-bottom: 10px !important;";

    this.tableBodyHeight = `calc(100% - ${this.paginationHeight} - ${this.toolbarHeight}) !important`;

    this.searchInputID = `${this.tableId}-toolbar-input`;

    this.pages = {};
    this.totalPages = null;

    this.createContainer();
  }

  /**
   * Initializes the table component, setting up DOM references and listeners.
   * @override
   */
  init() {
    this.tableContainer = this.container.querySelector(`#${this.tableContainerId}`);

    this.table = this.container.querySelector(`#${this.tableId}`);
    this.pagination = this.container.querySelector(`#${this.tableId}-pagination`);

    this.tableHeader = this.table.querySelector("thead");
    this.tableBody = this.table.querySelector("tbody");

    this.tablePaginationStart = this.pagination.querySelector(`#${this.tableId}-pagination-start`);
    this.tablePaginationEnd = this.pagination.querySelector(`#${this.tableId}-pagination-end`);
    this.tablePaginationTotal = this.pagination.querySelector(`#${this.tableId}-pagination-total`);

    this.exportTypeContainer = this.container.querySelector(`#${this.tableId}-toolbar-export-type`);

    this.#searchListener();
    this.#handleExport();
  }

  /**
   * Returns the HTML template for the table structure.
   * @override
   * @returns {string}
   */
  html() {
    let searchTemplate = "";
    let exportTemplate = "";
    let toolbarTemplate = "";
    let paginationTemplate = "";

    if (this.enableSearch) {
      searchTemplate = `<div id="${this.tableId}-toolbar-search" class="search">
                                <input type="text" 
                                    id="${this.searchInputID}"
                                    class="form-control form-control-sm float-end" 
                                    placeholder="Search..." 
                                    style="width: 200px; margin: .5em;"
                                    aria-label="Search">
                            </div>`;
    }

    if (this.enableExport) {
      exportTemplate = `<div id="${this.tableId}-toolbar-export" style="z-index: 100000" class="me-2">
                                <div class="export btn-group dropdown btn-group-sm">
                                    <button class="btn btn-secondary dropdown-toggle" 
                                        aria-label="Export data" 
                                        data-bs-toggle="dropdown" 
                                        type="button" 
                                        title="Export data">
                                        <i class="bi bi-download"></i>                                    
                                        <span class="caret"></span>
                                    </button>
                                    <div id="${this.tableId}-toolbar-export-type" 
                                        class="dropdown-menu dropdown-menu-end">
                                        <a class="dropdown-item" style="cursor: pointer;" data-type="json">JSON</a>
                                        <a class="dropdown-item" style="cursor: pointer;" data-type="csv">CSV</a>
                                    </div>
                                </div>
                            </div>`;
    }

    if (this.enableExport || this.enableSearch) {
      toolbarTemplate = `
                <div id="${this.tableId}-toolbar" 
                    class="d-flex flex-row justify-content-end align-items-center gap-2">
                        ${searchTemplate}       
                        ${exportTemplate}
                </div>`;
    }

    if (this.enablePagination) {
      paginationTemplate = `
                <div id="${this.tableId}-pagination" class="d-flex flex-row justify-content-between align-items-center m-2">
                    <div id="${this.tableId}-pagination-info" class="text-muted">
                        Showing <span id="${this.tableId}-pagination-start"></span> to <span id="${this.tableId}-pagination-end"></span> of <span id="${this.tableId}-pagination-total"></span> rows</div>
                    <nav aria-label="Page navigation example" class="align-self-center">
                        <ul id="${this.tableId}-pagination-data" class="pagination pagination-sm m-0">                            
                        </ul>
                    </nav>
                </div>`;
    }

    return `
            <div id="${this.tableContainerId}" 
                class="bt-table-container d-flex flex-column" 
                style="height: 100%; overflow-y: auto; margin: 0;">
                ${toolbarTemplate}
                <div id="${this.tableId}-body" 
                    class="table-responsive border-top scrollbar"
                    style="overflow-y: auto; margin: 0; min-height: ${this.tableBodyHeight}">
                    <table id="${this.tableId}" class="table bt-table table-sm align-middle m-0">
                        <thead id="${this.tableHeaderId}" class="sticky-top"></thead>
                        <tbody id="${this.tableBodyId}"></tbody>
                    </table>
                </div>     
                ${paginationTemplate}           
            </div>
        `;
  }

  /**
   * Updates the table with new data and refreshes the display.
   * @param {Array<Object>} newData - The new data array to display.
   */
  updateData(newData) {
    var data = [];
    if (!Array.isArray(newData)) data.push(newData);
    else data = newData;

    this.data = data;
    console.log(this.columns);
    if (this.fields.length === 0) {
      if (this.columns.length === 0 && this.data.length > 0) {
        this.columns = Object.keys(this.data[0]);
        console.log(this.columns, this.data[0]);
      }
    } else {
      this.columns = [...this.fields];
    }
    this.#initializeTable(this.data, this.columns);
  }

  clear() {
    this.tableBody.innerHTML = "";
    this.tableHeader.innerHTML = "";
  }

  #initializeTable(data, columns) {
    this.data = data;
    this.columns = columns.slice();

    const referenceFields = this.linkConfig?.fields || [];

    this.columns.unshift("#"); // Add an empty column for row numbers

    // Clear any existing table
    this.clear();

    const headerRow = document.createElement("tr");
    this.columns.forEach((col) => {
      const th = document.createElement("th");
      th.dataset.sortable = true;
      const div = document.createElement("div");
      div.classList.add("table-col-wrapper");
      div.textContent = col;
      th.appendChild(div);
      headerRow.appendChild(th);
    });
    this.tableHeader.appendChild(headerRow);

    let rowCount = 0;
    this.data.forEach((rowData) => {
      const row = document.createElement("tr");

      row.dataset.filtered = true;

      rowCount += 1;

      let colCount = 0;

      this.columns.forEach((col) => {
        const div = document.createElement("div");
        div.classList.add("table-col-wrapper");

        const td = document.createElement("td");
        td.noWrap = true;

        let colData = rowData[col];
        if (col === "#") {
          colData = rowCount;
          td.dataset.row_num = true;
        } else td.dataset.row_num = false;

        let refData = {};
        referenceFields.forEach((refCol) => (refData[refCol] = rowData[refCol]));

        const refKey = this.linkConfig.key;

        if (col == refKey) {
          const link = document.createElement("a");
          let listen = this.linkConfig.listen;
          link.classList.add("table-identifier-link", "clickable");
          for (const refCol of referenceFields) {
            listen = listen ? listen.replace(`:${refCol}`, refData[refCol]) : "#";
          }
          link.addEventListener("click", (event) => {
            event.preventDefault();
            this.emit(listen, rowData);
          });
          link.textContent = colData;
          div.appendChild(link);
        } else if (typeof colData == "object") {
          let jsonTxt = JSON.stringify(colData);

          const jsonDiv = document.createElement("div");
          jsonDiv.classList.add("d-flex", "gap-3");

          const nestedDiv = document.createElement("div");
          const iconDiv = document.createElement("div");
          iconDiv.style.minWidth = "30px";

          const icon = document.createElement("i");
          icon.classList.add("bi", "bi-eye", "clickable", "float-end", "d-none", "hover-light");
          icon.style.minWidth = "20px";
          icon.setAttribute("type", "button");
          iconDiv.appendChild(icon);

          nestedDiv.classList.add("json-nested-object");
          nestedDiv.textContent = jsonTxt;

          jsonDiv.appendChild(nestedDiv);
          jsonDiv.appendChild(iconDiv);
          div.appendChild(jsonDiv);
        } else {
          div.textContent = colData || "";
        }
        td.appendChild(div);

        if (colCount == 0) {
          td.style.width = "50px"; // Set width for the first column
        }
        colCount += 1;

        row.appendChild(td);
      });
      this.tableBody.appendChild(row);
    });

    this.refreshPagination();
    this.activatePage(1);
  }

  /**
   * Filters the table rows based on a search query.
   * @param {string} query - The search term.
   */
  handleSearch(query) {
    console.log("Searching for:", query);
    const lowerQuery = query.toLowerCase();
    const rows = this.tableBody.querySelectorAll("tr");

    let count = 1;
    rows.forEach((row) => {
      row.style.display = "none";
      let matched = false;

      const cells = row.querySelectorAll("td");
      let rowNumCell = null;
      cells.forEach((cell) => {
        if (cell.dataset.row_num == "true") {
          rowNumCell = cell;
          return; // skip row number cell
        }
        if (cell.textContent.toLowerCase().includes(lowerQuery)) {
          matched = true;
        }
      });
      row.dataset.filtered = matched;
      if (matched) {
        row.style.display = "table-row";
        if (rowNumCell) {
          const div = rowNumCell.querySelector("div");
          div.textContent = count++;
        }
      } else row.style.display = "none";
    });
    this.refreshPagination();
    this.activatePage(1);
  }

  #searchListener() {
    if (!this.enableSearch) return;

    const debouncedHandleSearch = Utility.debounce(this.handleSearch.bind(this));

    this.searchInput = this.container.querySelector(`#${this.searchInputID}`);
    if (this.searchInput) {
      this.searchInput.addEventListener("input", (event) =>
        debouncedHandleSearch(event.target.value)
      );
    }
  }

  #handleExport() {
    if (!this.exportTypeContainer) return;

    this.exports = this.exportTypeContainer.querySelectorAll("a.dropdown-item");

    this.exports.forEach((exportItem) => {
      exportItem.addEventListener("click", (event) => {
        const selectedType = event.target.dataset.type;
        console.log("Export type:", selectedType);

        setTimeout(() => {
          let jsonColumns = new Set();
          let nonJsonColumns = new Set();

          $(`#${this.tableId}`).tableExport({
            type: selectedType,
            ignoreColumn: [0], // Ignore the first column (row numbers)
            onCellData: ($cell, row, col, href) => {
              if (row == 0 && $cell[0].localName == "th") return href;

              if (selectedType === "json") {
                if (!nonJsonColumns.has(col) && !jsonColumns.has(col)) {
                  try {
                    const val = JSON.parse(href);
                    jsonColumns.add(col);
                    return val;
                  } catch (e) {
                    console.error(e);
                    nonJsonColumns.add(col);
                  }
                } else if (jsonColumns.has(col)) {
                  try {
                    return JSON.parse(href);
                  } catch (e) {
                    console.error(e);
                    // Ignore parsing errors
                  }
                }
              }
              return href;
            },
            onIgnoreRow: ($tr, row) => {
              if (row == 0) return false;
              return !($tr[0].dataset.filtered == "true");
            },
          });
        }, 100);
      });
    });
  }

  #createPageItem(pageNumber, maxPagesToShow = 5) {
    const pageItem = document.createElement("li");

    pageItem.classList.add("page-item");
    if (pageNumber === 1) pageItem.classList.add("active");

    const pageLink = document.createElement("a");
    pageLink.classList.add("page-link");
    pageLink.dataset.page = pageNumber;
    pageLink.href = "#";

    // eslint-disable quotes
    if (pageNumber == "start") {
      pageLink.innerHTML = '<span aria-hidden="true">&laquo;</span>';
    } else if (pageNumber == "end") {
      pageLink.innerHTML = '<span aria-hidden="true">&raquo;</span>';
    } else if (pageNumber == "previous") {
      pageLink.innerHTML = '<span aria-hidden="true" style="font-size: 10px;">❮</span>';
    } else if (pageNumber == "next") {
      pageLink.innerHTML = '<span aria-hidden="true" style="font-size: 10px;">❯</span>';
    } else {
      pageLink.textContent = pageNumber;
    }

    console.log(typeof pageNumber);
    if (pageNumber > maxPagesToShow) {
      pageItem.style.display = "none";
    }

    pageLink.addEventListener("click", (event) => {
      event.preventDefault();
      const currentActive = this.container.querySelector(
        `#${this.tableId}-pagination-data .page-item.active`
      );
      const currentActivePage = currentActive
        ? parseInt(currentActive.querySelector("a").dataset.page)
        : null;

      if (currentActive) currentActive.classList.remove("active");

      let currentPageNumber = pageNumber;

      if (pageNumber == "previous") {
        currentPageNumber = currentActivePage > 1 ? currentActivePage - 1 : 1;
      } else if (pageNumber == "next") {
        currentPageNumber =
          currentActivePage < this.totalPages ? currentActivePage + 1 : this.totalPages;
      }
      if (pageNumber == "start") {
        currentPageNumber = 1;
      } else if (pageNumber == "end") {
        currentPageNumber = this.totalPages;
      }
      this.activatePage(currentPageNumber);
    });

    pageItem.appendChild(pageLink);
    return pageItem;
  }

  /**
   * Activates a specific page and updates the visible rows.
   * @param {number} pageNumber - The 1-indexed page number to activate.
   */
  activatePage(pageNumber) {
    if (!this.enablePagination) return;

    if (this.pages.length === 0 || !this.pages[pageNumber]) return;

    console.log("Activating page:", pageNumber);

    this.pages[pageNumber].classList.add("active");

    const startIdx = (pageNumber - 1) * this.pageSize;
    const endIdx = startIdx + this.pageSize;

    const visibleRows = this.getFilteredRows();
    visibleRows.forEach((row, index) => {
      if (index >= startIdx && index < endIdx) {
        row.style.display = "table-row";
      } else {
        row.style.display = "none";
      }
    });

    const endPage = Math.min(this.totalPages, pageNumber + 4);
    const startPage = Math.max(1, endPage - 4);

    for (let i = 1; i <= this.totalPages; i++) {
      const pageItem = this.pages[i];
      if (i < startPage || i > endPage) {
        pageItem.style.display = "none";
      } else {
        pageItem.style.display = "block";
      }
    }

    console.log(this.tablePaginationStart);
    this.tablePaginationStart.textContent = startIdx + 1;
    this.tablePaginationEnd.textContent = Math.min(endIdx, visibleRows.length);
    this.tablePaginationTotal.textContent = visibleRows.length;
  }

  refreshPagination() {
    if (!this.enablePagination) return;

    const visibleRows = this.getFilteredRows();
    const dataLen = visibleRows.length;

    this.pages = {};
    this.totalPages = Math.ceil(dataLen / this.pageSize);

    console.log("Visible rows:", dataLen, "Pages: ", this.totalPages);

    const paginationData = this.container.querySelector(`#${this.tableId}-pagination-data`);
    paginationData.innerHTML = "";

    const pageStart = this.#createPageItem("start");
    paginationData.appendChild(pageStart);
    this.pages["start"] = pageStart;

    const pagePrevious = this.#createPageItem("previous");
    paginationData.appendChild(pagePrevious);
    this.pages["previous"] = pagePrevious;

    for (let i = 1; i <= this.totalPages; i++) {
      const pageItem = this.#createPageItem(i);
      paginationData.appendChild(pageItem);
      this.pages[i] = pageItem;
    }

    const pageNext = this.#createPageItem("next");
    paginationData.appendChild(pageNext);
    this.pages["next"] = pageNext;

    const pageEnd = this.#createPageItem("end");
    paginationData.appendChild(pageEnd);
    this.pages["end"] = pageEnd;
  }

  getFilteredRows() {
    const rows = this.tableBody.querySelectorAll("tr");
    return Array.from(rows).filter((row) => row.dataset.filtered === "true");
  }
}

export default Table;
