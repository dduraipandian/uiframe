import Spinner from "../components/spinner.js";

describe("Spinner Component", () => {
  let container;

  beforeEach(() => {
    // Create a container for the spinner to be rendered into
    container = document.createElement("div");
    container.id = "test-container";
    document.body.appendChild(container);
    jest.useFakeTimers();
  });

  afterEach(() => {
    document.body.innerHTML = "";
    jest.clearAllTimers();
  });

  test("should initialize with default options", () => {
    const spinner = new Spinner({ name: "MySpinner" });
    expect(spinner.name).toBe("MySpinner");
    expect(spinner.spinnerColor).toBe("text-secondary");
    expect(spinner.enabledCancel).toBe(false);
    expect(spinner.spinnerType).toBe("border");
    expect(spinner.loadingText).toBe("Loading");
  });

  test("should initialize with custom options", () => {
    const options = {
      spinnerColor: "text-primary",
      enabledCancel: true,
      spinnerType: "grow",
      loadingText: "Wait",
    };
    const spinner = new Spinner({ name: "CustomSpinner", options });
    expect(spinner.spinnerColor).toBe("text-primary");
    expect(spinner.enabledCancel).toBe(true);
    expect(spinner.spinnerType).toBe("grow");
    expect(spinner.loadingText).toBe("Wait");

    spinner.renderInto(container);
    const spinnerElement = document.getElementById(spinner.containerID);
    expect(spinnerElement).toBeTruthy();
    expect(spinnerElement.querySelector(".spinner-grow")).toBeTruthy();
  });

  test("should render html correctly", () => {
    const spinner = new Spinner({ name: "RenderSpinner" });
    // Mocking parent container methods for renderInto if necessary,
    // but here we might just want to check the html string or use renderInto if supported by JSDOM tests effectively.
    // Since renderInto is in the base class and uses DOM, let's invoke it.

    // We need to implement a basic mock or just use the real base class if it works in JSDOM.
    // The base class is imported in Spinner, so it should work.

    spinner.renderInto(container);

    const spinnerElement = document.getElementById(spinner.containerID);
    expect(spinnerElement).toBeTruthy();
    expect(spinnerElement.querySelector(".spinner-border")).toBeTruthy();
    expect(spinnerElement.textContent).toContain("Loading");
  });

  test("should show and hide the spinner", () => {
    const spinner = new Spinner({ name: "ShowHideSpinner" });
    spinner.renderInto(container);

    spinner.show();
    const element = spinner.getContainer();
    expect(element.style.display).toBe("block");
    expect(element.querySelector(`#${spinner.spinnerTextId}`).textContent).toBe("Loading");

    spinner.hide();
    expect(element.style.display).toBe("none");
  });

  test("should show cancel button when enabled", () => {
    const spinner = new Spinner({ name: "CancelSpinner", options: { enabledCancel: true } });
    spinner.renderInto(container);

    const cancelButton = document.getElementById(spinner.cancelId);
    expect(cancelButton).toBeTruthy();
    expect(cancelButton.textContent.trim()).toBe("Cancel");
  });

  test("should emit cancel event on button click", () => {
    const spinner = new Spinner({ name: "EventSpinner", options: { enabledCancel: true } });
    spinner.renderInto(container);

    const cancelButton = document.getElementById(spinner.cancelId);
    const cancelSpy = jest.fn();

    spinner.element.addEventListener(spinner.cancelEventId, cancelSpy);

    cancelButton.click();

    expect(cancelSpy).toHaveBeenCalled();
    expect(spinner.element.style.display).toBe("none"); // Should hide on cancel
  });

  test("should animate dots when requested", () => {
    const spinner = new Spinner({ name: "AnimSpinner" });
    spinner.renderInto(container);

    spinner.show("Loading", true);

    const textElement = document.getElementById(spinner.spinnerTextId);
    expect(textElement.textContent).toBe("Loading");

    jest.advanceTimersByTime(500);
    expect(textElement.textContent).toBe("Loading.");

    jest.advanceTimersByTime(500);
    expect(textElement.textContent).toBe("Loading..");

    jest.advanceTimersByTime(500);
    expect(textElement.textContent).toBe("Loading...");

    jest.advanceTimersByTime(500);
    expect(textElement.textContent).toBe("Loading"); // Reset cycle
  });
});
