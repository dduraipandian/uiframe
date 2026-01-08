// eslint-disable-next-line import/extensions
import { Utility } from "../components/core";

describe("Utility Class", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("debounce should delay function execution", () => {
    const callback = jest.fn();
    const debounced = Utility.debounce(callback, 500);

    debounced("test");
    expect(callback).not.toHaveBeenCalled();

    jest.advanceTimersByTime(500);
    expect(callback).toHaveBeenCalledWith("test");
  });

  test("debounce should reset timer on consecutive calls", () => {
    const callback = jest.fn();
    const debounced = Utility.debounce(callback, 500);

    debounced();
    jest.advanceTimersByTime(300);
    debounced();
    jest.advanceTimersByTime(300);

    expect(callback).not.toHaveBeenCalled();

    jest.advanceTimersByTime(200);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  test("deepValue should get value at path", () => {
    const obj = { a: { b: { c: 42 } } };
    expect(Utility.deepValue(obj, "a.b.c")).toBe(42);
    expect(Utility.deepValue(obj, "a.x")).toBeUndefined();
  });

  test("deepValue should set and return default value if missing", () => {
    const obj = { a: {} };
    const result = Utility.deepValue(obj, "a.b", "default");
    expect(result).toBe("default");
    expect(obj.a.b).toBe("default");
  });

  test("deleteValue should remove property at path", () => {
    const obj = { a: { b: 1, c: 2 } };
    const result = Utility.deleteValue(obj, "a.b");
    expect(result).toBe(true);
    expect(obj.a.b).toBeUndefined();
    expect(obj.a.c).toBe(2);
  });

  test("deleteValue should return false for invalid path", () => {
    const obj = { a: 1 };
    expect(Utility.deleteValue(obj, "b.c")).toBe(false);
  });
});
