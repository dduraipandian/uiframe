import Dropdown from "../components/dropdown.js";

describe("Dropdown Component", () => {
  let container;

  beforeEach(() => {
    container = document.createElement("div");
    container.id = "test-container";
    document.body.appendChild(container);
    jest.useFakeTimers();
  });

  afterEach(() => {
    document.body.innerHTML = "";
    jest.useRealTimers();
  });

  test("should render with initial items and handle search", () => {
    const items = [
      { name: "Apple", value: "apple" },
      { name: "Banana", value: "banana" },
      { name: "Cherry", value: "cherry" },
    ];
    const dropdown = new Dropdown({
      name: "FruitDropdown",
      options: { search: true },
    });
    dropdown.renderInto(container);
    dropdown.setDropdownItems(items);

    const itemsContainer = document.getElementById(dropdown.dropDownItemContainerId);
    expect(itemsContainer.querySelectorAll(".dropdown-item").length).toBe(3);

    // Test search
    dropdown.handleSearch("ba");
    const apple = itemsContainer.querySelector('[data-name="Apple"]');
    const banana = itemsContainer.querySelector('[data-name="Banana"]');

    expect(apple.style.display).toBe("none");
    expect(banana.style.display).toBe("block");
  });

  test("should emit event and set active class on item click", () => {
    const items = [{ name: "Item 1", value: "i1" }];
    const dropdown = new Dropdown({ name: "ClickDropdown" });
    dropdown.renderInto(container);
    dropdown.setDropdownItems(items);

    const spy = jest.fn();
    dropdown.on("item:click", spy);

    const itemLink = container.querySelector(".dropdown-item");
    itemLink.click();

    expect(spy).toHaveBeenCalledWith(items[0]);

    // dropdown menu should be active after item click
    expect(itemLink.classList.contains("active")).toBe(true);
    expect(container.querySelector(".dropdown-title").textContent).toBe("Item 1");
  });
});
