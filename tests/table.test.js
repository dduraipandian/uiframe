import Table from "../components/table.js";

describe("Table Component", () => {
  let container;

  beforeEach(() => {
    container = document.createElement("div");
    container.id = "test-container";
    document.body.appendChild(container);

    // Mock jQuery for tableExport if needed,
    // though we are mostly testing DOM structure and internal logic.
    global.$ = jest.fn().mockReturnValue({
      tableExport: jest.fn(),
    });
  });

  afterEach(() => {
    document.body.innerHTML = "";
    delete global.$;
  });

  test("should render headers and data correctly", () => {
    const data = [
      { id: 1, name: "Alice", age: 25 },
      { id: 2, name: "Bob", age: 30 },
    ];
    const table = new Table({ name: "UserTable", options: { pagination: false } });
    table.renderInto(container);
    table.updateData(data);

    const headers = container.querySelectorAll("th");
    // # + id + name + age = 4
    expect(headers.length).toBe(4);
    expect(headers[1].textContent).toBe("id");

    const rows = container.querySelectorAll("tbody tr");
    expect(rows.length).toBe(2);
    expect(rows[0].querySelectorAll("td")[2].textContent).toBe("Alice");
  });

  test("should handle search filtering", () => {
    const data = [{ name: "Apple" }, { name: "Banana" }, { name: "Cherry" }];
    const table = new Table({ name: "FilterTable", options: { pagination: false } });
    table.renderInto(container);
    table.updateData(data);

    table.handleSearch("ap");
    const rows = container.querySelectorAll("tbody tr");

    // JSDOM doesn't support full CSS visibility but we can check dataset.filtered
    // and style.display set by handleSearch
    expect(rows[0].style.display).toBe("table-row"); // Apple
    expect(rows[1].style.display).toBe("none"); // Banana
    expect(rows[0].dataset.filtered).toBe("true");
  });

  test("should generate pagination correctly", () => {
    const data = Array.from({ length: 50 }, (_, i) => ({ id: i, name: `User ${i}` }));
    const table = new Table({ name: "PageTable", options: { pagination: true, pageSize: 10 } });
    table.renderInto(container);
    table.updateData(data);

    expect(table.totalPages).toBe(5);

    const paginationItems = container.querySelectorAll(".page-item");
    // start + previous + 5 pages + next + end = 9
    expect(paginationItems.length).toBe(9);

    // First page should show 10 rows
    const visibleRows = container.querySelectorAll('tbody tr[style="display: table-row;"]');
    expect(visibleRows.length).toBe(10);
    expect(container.querySelector(`#${table.tableId}-pagination-start`).textContent).toBe("1");
    expect(container.querySelector(`#${table.tableId}-pagination-end`).textContent).toBe("10");
  });
});
