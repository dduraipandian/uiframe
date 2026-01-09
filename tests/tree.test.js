import { Tree } from "../components/tree.js";

describe("Tree Component", () => {
  let container;
  const sampleData = [
    {
      name: "Root A",
      children: [
        { name: "Child A1", children: [] },
        { name: "Child A2", children: [] },
        { name: "Child A3", children: [] },
      ],
    },
    {
      name: "Root B",
      children: [],
    },
  ];

  beforeEach(() => {
    container = document.createElement("div");
    container.id = "test-container";
    document.body.appendChild(container);

    // Mock requestAnimationFrame for animateExpandedCollapse
    jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => cb());
  });

  afterEach(() => {
    document.body.innerHTML = "";
    jest.restoreAllMocks();
  });

  test("should initialize with default objects and options", () => {
    const tree = new Tree({ name: "MyTree" });
    expect(tree.name).toBe("MyTree");
    expect(tree.objects).toEqual([]);
    expect(tree.openedNodes).toEqual({});
  });

  test("should render root nodes into container", () => {
    const tree = new Tree({ name: "MyTree", objects: sampleData });
    tree.renderInto(container);

    const treeElement = document.getElementById("mytree-tree");
    expect(treeElement).toBeTruthy();

    // Check for Root A and Root B using their stable IDs
    // stableId = `${parentPathId}-${safeName}` where parentPathId starts as "root"
    const rootA = document.getElementById("root-Root-A");
    const rootB = document.getElementById("root-Root-B");
    const rootAC1 = document.getElementById("root-Root-A-Child-A1");

    expect(rootA).toBeTruthy();
    expect(rootB).toBeTruthy();
    expect(rootAC1).toBeNull();

    expect(rootA.textContent).toContain("Root A");
    expect(rootB.textContent).toContain("Root B");
  });

  test("should track opened nodes when collapse events are triggered", () => {
    const tree = new Tree({ name: "MyTree", objects: sampleData });
    tree.renderInto(container);

    const rootACollapse = document.getElementById("root-Root-A-collapse");

    // Simulate Bootstrap collapse 'shown' event
    const shownEvent = new CustomEvent("shown.bs.collapse", { bubbles: true });
    rootACollapse.dispatchEvent(shownEvent);
    expect(tree.openedNodes["root-Root-A"]).toBe(true);

    // Simulate Bootstrap collapse 'hidden' event
    const hiddenEvent = new CustomEvent("hidden.bs.collapse", { bubbles: true });
    rootACollapse.dispatchEvent(hiddenEvent);
    expect(tree.openedNodes["root-Root-A"]).toBeUndefined();
  });

  test("should load children on expand", () => {
    const tree = new Tree({ name: "MyTree", objects: sampleData });
    tree.renderInto(container);

    const rootACollapse = document.getElementById("root-Root-A-collapse");

    // Initially, Child A1 shouldn't be in the DOM because upsertChild hasn't been called for Root A
    expect(document.getElementById("root-Root-A-Child-A1")).toBeNull();

    // Simulate show event to trigger upsertChild
    const showEvent = new CustomEvent("show.bs.collapse", { bubbles: true });
    rootACollapse.dispatchEvent(showEvent);

    expect(document.getElementById("root-Root-A-Child-A1")).toBeTruthy();
    expect(document.getElementById("root-Root-A-Child-A1").textContent).toContain("Child A1");
  });

  test("should support lazy loading via data_callback", () => {
    const lazyData = [{ name: "LazyRoot" }]; // children is undefined, triggering callback

    // eslint-disable-next-line no-unused-vars
    const callback = jest.fn((node) => [{ name: "LazyChild", children: [] }]);

    const tree = new Tree({
      name: "LazyTree",
      objects: lazyData,
      options: { data_callback: callback },
    });
    tree.renderInto(container);

    const lazyRootCollapse = document.getElementById("root-LazyRoot-collapse");

    // Trigger expand
    const showEvent = new CustomEvent("show.bs.collapse", { bubbles: true });
    lazyRootCollapse.dispatchEvent(showEvent);

    expect(callback).toHaveBeenCalledWith(lazyData[0]);
    expect(document.getElementById("root-LazyRoot-LazyChild")).toBeTruthy();
  });

  test("should update a node with new children", () => {
    const tree = new Tree({ name: "UpdateTree", objects: sampleData });
    tree.renderInto(container);

    const rootB = document.getElementById("root-Root-B");
    const newData = [{ name: "NewChild", children: [] }];

    tree.update(rootB, newData);

    expect(document.getElementById("root-Root-B-NewChild")).toBeTruthy();
  });

  test("should refresh a node with new data", () => {
    const tree = new Tree({ name: "RefreshTree", objects: JSON.parse(JSON.stringify(sampleData)) });
    tree.renderInto(container);

    const rootA = document.getElementById("root-Root-A");
    const newData = [{ name: "RefreshedChild", children: [] }];

    // Refresh Root A (which had Child A1)
    tree.refresh(rootA, newData);

    expect(document.getElementById("root-Root-A-Child-A1")).toBeNull();
    expect(document.getElementById("root-Root-A-RefreshedChild")).toBeTruthy();
  });

  test("should remove a node from DOM and objects", () => {
    const tree = new Tree({ name: "RemoveTree", objects: JSON.parse(JSON.stringify(sampleData)) });
    tree.renderInto(container);

    const rootB = document.getElementById("root-Root-B");
    tree.remove(rootB);

    expect(document.getElementById("root-Root-B")).toBeNull();
    // Use a safe check as Utility.deleteValue might leave holes in arrays
    expect(tree.objects.find((o) => o && o.name === "Root B")).toBeUndefined();
  });
});
