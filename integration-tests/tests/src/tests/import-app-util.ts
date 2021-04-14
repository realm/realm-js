import { expect } from "chai";

import { importApp } from "../utils/app-importer";

describe("importApp utility", function() {
  this.slow(2000);

  it("can import an app", async () => {
    const appId = await importApp("simple");
    expect(typeof appId).equals("string");
    expect(appId.startsWith("simple")).equals(true);
  });

  it("throws on unexpected app names", async () => {
    let threw = false;
    try {
      await importApp("unexpected-app-name");
    } catch (err) {
      threw = true;
      expect(err.message.includes("Unexpected app name")).equals(true);
    } finally {
      expect(threw).equals(true);
    }
  });
});