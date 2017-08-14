"use strict";

const Realm = require("realm");

describe("Test harness", () => {
  it("does have a chrome version", () => {
    expect(process.versions.chrome).not.toBeUndefined();
  });

  if(global.options && global.options.runIn === "main") {
    describe("in the main process", () => {
      it("does not have a window global", () => {
        expect(global.window).toBeUndefined();
      });

      it("does not have a navigator global", () => {
        expect(global.navigator).toBeUndefined();
      });
    });
  } else {
    describe("in the render process", () => {
      it("does have a window global", () => {
        expect(global.window).not.toBeUndefined();
      });

      const userAgent = global.navigator.userAgent;
      it("does have Electron in its userAgent", () => {
        expect(userAgent.indexOf("Electron")).not.toBe(-1);
      });

      it("does have Chrome in its userAgent", () => {
        expect(userAgent.indexOf("Chrome")).not.toBe(-1);
      });
    });
  }

  it("waits for async tests to complete", (done) => {
    setTimeout(() => {
      done();
    }, 1000);
  });

  describe("loading Realm", () => {
    it("exports a function", () => {
      expect(typeof(Realm)).toBe("function");
    });

    it("exports a constructor named Realm", () => {
      expect(Realm.name).toBe("Realm");
    });
  });
});
