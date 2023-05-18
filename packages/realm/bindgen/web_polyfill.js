// Polyfill for setTimeout which is not standard in Web environement
if (!globalThis.setImmediate) {
    globalThis.setImmediate = (callback, ...args) => {
      if (typeof callback !== "function") {
        throw new TypeError("Callback must be a function");
      }
  
      setTimeout(() => {
        callback(...args);
      }, 0);
    };
  }
  
