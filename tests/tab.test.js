// eslint-disable-next-line import/extensions
import { EmitterComponent } from "../components/core";
import { Tab } from "../components/tab.js";

class MockContent extends EmitterComponent {
  html() {
    return '<div id="mock-content">Mock</div>';
  }
  init() {}
}

describe("Tab Component", () => {
  let container;

  beforeEach(() => {
    container = document.createElement("div");
    container.id = "test-container";
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  test("should render initial tabs and handle active state", () => {
    const tabs = [
      { id: "tab1", title: "Tab 1", content: "Content 1" },
      { id: "tab2", title: "Tab 2", content: "Content 2" },
    ];
    const tab = new Tab({ name: "MyTabs", options: { tabs, activeTab: "tab1" } });
    tab.renderInto(container);

    expect(container.querySelector("#tab1-tab").classList.contains("active")).toBe(true);
    expect(container.querySelector("#tab2-tab").classList.contains("active")).toBe(false);
    expect(container.querySelector("#tab1-content").textContent).toContain("Content 1");
    expect(tab.tabs.length).toBe(2);
  });

  test("should add a new tab dynamically", () => {
    const tab = new Tab({ name: "MyTabs", options: { tabs: [] } });
    tab.renderInto(container);

    expect(tab.tabs.length).toBe(0);
    const newTab = { id: "new", title: "New Tab", content: new MockContent({ name: "Mock" }) };
    tab.addTab(newTab);

    expect(container.querySelector("#new-tab")).toBeTruthy();
    expect(container.querySelector("#mock-content")).toBeTruthy();
  });

  test("should emit on tab change", () => {
    const tab = new Tab({ name: "MyTabs", options: { tabs: [] } });
    tab.renderInto(container);

    const newTab1 = { id: "tab1", title: "New Tab 1", content: new MockContent({ name: "Mock" }) };
    const newTab2 = { id: "tab2", title: "New Tab 2", content: new MockContent({ name: "Mock" }) };
    tab.addTab(newTab1);
    tab.addTab(newTab2);

    const spyFn = jest.fn();

    tab.on("tab:change", spyFn);

    const tab1Btn = container.querySelector("#tab1-tab");
    tab1Btn.dispatchEvent(new Event("shown.bs.tab", { bubbles: true }));
    expect(spyFn).toHaveBeenCalledWith({ id: "tab1" });

    const tab2Btn = container.querySelector("#tab2-tab");
    tab2Btn.dispatchEvent(new Event("shown.bs.tab", { bubbles: true }));
    expect(spyFn).toHaveBeenCalledWith({ id: "tab2" });
  });
});
