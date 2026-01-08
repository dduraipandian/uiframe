import { Online } from "../components/online.js";

describe("Online Component", () => {
  let container;
  let mockToast;

  beforeEach(() => {
    // Mock navigator.onLine
    Object.defineProperty(window.navigator, "onLine", {
      value: true,
      writable: true,
    });

    // Mock bootstrap.Toast
    mockToast = { show: jest.fn() };
    global.bootstrap = {
      Toast: {
        getOrCreateInstance: jest.fn().mockReturnValue(mockToast),
      },
    };

    container = document.createElement("div");
    container.id = "test-container";
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.innerHTML = "";
    delete global.bootstrap;
  });

  test("should render initial online status", () => {
    const online = new Online({ name: "Status" });
    online.renderInto(container);

    expect(container.textContent).toContain("Online.");
    expect(container.querySelector("svg").getAttribute("fill")).toBe("green");
  });

  test("should update status and show toast on offline/online events", () => {
    const online = new Online({ name: "Status" });
    online.renderInto(container);

    // Offline
    window.navigator.onLine = false;
    window.dispatchEvent(new Event("offline"));

    expect(container.textContent).toContain("Offline.");
    expect(container.querySelector("svg").getAttribute("fill")).toBe("red");
    expect(mockToast.show).toHaveBeenCalled();
    expect(document.getElementById(online.notificationBodyId).textContent).toBe(
      online.offlineNotificationText
    );

    // Online
    window.navigator.onLine = true;
    window.dispatchEvent(new Event("online"));

    expect(container.textContent).toContain("Online.");
    expect(container.querySelector("svg").getAttribute("fill")).toBe("green");
    expect(document.getElementById(online.notificationBodyId).textContent).toBe(
      online.onlineNotificationText
    );
  });
});
