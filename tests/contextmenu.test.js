import ContextMenu from "../components/contextmenu.js";

describe("ContextMenu Component", () => {
  let container;
  let mockBootstrapDropdown;

  beforeEach(() => {
    // Mock Bootstrap
    mockBootstrapDropdown = {
      show: jest.fn(),
      hide: jest.fn(),
    };
    global.bootstrap = {
      Dropdown: jest.fn().mockReturnValue(mockBootstrapDropdown),
    };

    container = document.createElement("div");
    container.id = "test-container";
    document.body.appendChild(container);

    jest.useFakeTimers();
    // Mock requestAnimationFrame
    jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => cb());
  });

  afterEach(() => {
    document.body.innerHTML = "";
    jest.useRealTimers();
    jest.restoreAllMocks();
    delete global.bootstrap;
  });

  test("should initialize and set contextMenu option to true", () => {
    const menu = new ContextMenu({ name: "MyMenu" });
    expect(menu.options.contextMenu).toBe(true);
    expect(menu.isContextMenu).toBe(true);
  });

  test("should initialize bootstrap dropdown after 1s delay", () => {
    const menu = new ContextMenu({ name: "MyMenu" });
    menu.renderInto(container);

    expect(global.bootstrap.Dropdown).not.toHaveBeenCalled();

    // Fast-forward 1s
    jest.advanceTimersByTime(1000);

    // Dropdown menu in context menu should have initiated with popperConfig: null
    // as position of dropdown is controlled manually. So to avoid bootstrap updating
    // position of dropdown.
    expect(global.bootstrap.Dropdown).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({ popperConfig: null })
    );
    expect(menu.dropdown).toBe(mockBootstrapDropdown);
  });

  test("should show at correct position and call dropdown.show", () => {
    const items = [{ name: "Action 1", value: "a1" }];
    const menu = new ContextMenu({ name: "MyMenu", options: { contextData: items } });
    menu.renderInto(container);
    jest.advanceTimersByTime(1000);

    // Create a mock context-menu-container
    const targetContainer = document.createElement("div");
    targetContainer.classList.add("context-menu-container");
    document.body.appendChild(targetContainer);

    const mockEvent = {
      preventDefault: jest.fn(),
      target: targetContainer,
      clientX: 100,
      clientY: 200,
    };

    const context = { some: "context" };
    menu.show(context, mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(menu.menu.style.left).toBe("100px");
    expect(menu.menu.style.top).toBe("200px");
    expect(menu.menu.style.position).toBe("fixed");

    // requestAnimationFrame is mocked to execute immediately
    expect(mockBootstrapDropdown.show).toHaveBeenCalled();
    expect(menu.currentNode).toBe(targetContainer);
    expect(menu.context).toBe(context);
  });

  test("should hide when hide is called or on document click", () => {
    const menu = new ContextMenu({ name: "MyMenu" });
    menu.renderInto(container);
    jest.advanceTimersByTime(1000);

    // Note: this show might bail if no container, but let's test hide directly
    menu.show(
      {},
      { preventDefault: jest.fn(), target: document.createElement("div"), clientX: 0, clientY: 0 }
    );

    menu.hide();
    expect(mockBootstrapDropdown.hide).toHaveBeenCalled();
    expect(menu.currentNode).toBeNull();
    expect(menu.context).toBeNull();

    // Test document click
    mockBootstrapDropdown.hide.mockClear();
    document.dispatchEvent(new MouseEvent("click"));
    expect(mockBootstrapDropdown.hide).toHaveBeenCalled();
  });

  test("should trigger callback with context and node on item click", () => {
    const callback = jest.fn();
    const items = [{ name: "Action 1", value: "a1", callback: callback }];
    const menu = new ContextMenu({ name: "MyMenu", options: { contextData: items } });
    menu.renderInto(container);
    jest.advanceTimersByTime(1000);

    const targetContainer = document.createElement("div");
    targetContainer.classList.add("context-menu-container");

    menu.show(
      { ctx: 1 },
      {
        preventDefault: jest.fn(),
        target: targetContainer,
        clientX: 0,
        clientY: 0,
      }
    );

    menu.setDropdownItems(items);
    const itemLink = menu.dropdownItemContainer.querySelector("a");

    menu.itemOnClick(itemLink, items[0]);
    expect(callback).toHaveBeenCalledWith({ ctx: 1 }, targetContainer);

    // context menu should not active after item click
    expect(itemLink.classList.contains("active")).toBe(false);
  });
});
