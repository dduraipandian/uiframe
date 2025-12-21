import { Component, EmitterComponent } from "../components/base.js";

// Define concrete classes for testing base classes
class TestComponent extends Component {
  html() {
    return '<div id="test-el">Test</div>';
  }
  init() {}
}

class TestEmitter extends EmitterComponent {
  html() {
    return "<div>Emitter</div>";
  }
  init() {}
}

describe("Base Component Classes", () => {
  let container;

  beforeEach(() => {
    container = document.createElement("div");
    container.id = "app";
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  test("Component should generate unique ID and renderInto", () => {
    const comp = new TestComponent({ name: "Comp" });
    expect(comp.id).toBeTruthy();
    expect(comp.name).toBe("Comp");

    comp.renderInto(container);
    expect(container.querySelector("#test-el")).toBeTruthy();
    expect(comp.container.parentElement).toBe(container);
  });

  test("Component should throw if instantiated directly", () => {
    expect(() => new Component({ name: "Base" })).toThrow(
      "Cannot construct Component instances directly"
    );
  });

  test("EmitterComponent should handle events", () => {
    const emitter = new TestEmitter({ name: "Emitter" });
    const spy = jest.fn();

    emitter.on("test-event", spy);
    emitter.emit("test-event", { data: 1 });

    expect(spy).toHaveBeenCalledWith({ data: 1 });

    emitter.off("test-event", spy);
    emitter.emit("test-event", { data: 2 });
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
