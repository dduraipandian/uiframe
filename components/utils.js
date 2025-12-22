/**
 * Static utility helper class providing shared logic like debouncing and object path manipulation.
 */
class Utility {
  /**
   * Returns a debounced version of the provided callback function.
   * @param {Function} callback - The function to debounce.
   * @param {number} [delay=500] - Delay in milliseconds.
   * @returns {Function}
   */
  static debounce(callback, delay = 500) {
    let timeoutId;

    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        callback(...args);
      }, delay);
    };
  }

  /**
   * Retrieves a value from a nested object using a dot-notation path.
   * Optionally sets a default value if the path does not exist.
   * @param {Object} obj - The target object.
   * @param {string} path - The dot-notation path (e.g., 'user.profile.name').
   * @param {*} [defaultValue] - Default value to set and return if path is missing.
   * @returns {*}
   */
  static deepValue(obj, path, defaultValue = undefined) {
    let prevObj = obj;
    for (var i = 0, pathArr = path.split("."), len = pathArr.length; i < len; i++) {
      obj = obj[pathArr[i]];
      if (obj === undefined && defaultValue != undefined) {
        prevObj[pathArr[i]] = defaultValue;
        return defaultValue;
      }
      prevObj = obj;
    }
    return obj;
  }

  /**
   * Deletes a property from a nested object using a dot-notation path.
   * @param {Object} obj - The target object.
   * @param {string} path - The dot-notation path.
   * @returns {boolean} True if deleted, false otherwise.
   */
  static deleteValue(obj, path) {
    const keys = path.split(".");
    if (keys.length === 0) return false;

    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
      if (current === undefined) return false;
    }

    const lastKey = keys[keys.length - 1];
    if (lastKey in current) {
      delete current[lastKey];
      return true;
    }
    return false;
  }

  static observe(element, callback, root = null) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) callback();
        });
      },
      {
        root: root,
        threshold: 0.1, // fire when 10% of the element is visible
      }
    );
    observer.observe(element);
  }
}

export default Utility;
