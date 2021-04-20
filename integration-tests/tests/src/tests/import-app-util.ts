import { App } from "realm";
import { expect } from "chai";

import { importApp } from "../utils/import-app";

describe.skipIf("localOnly", "importApp utility", function() {
  this.slow(2000);

  it("can import an app", async () => {
    const app = await importApp("simple");
    expect(app).instanceOf(App);
    expect(app.id.startsWith("simple")).equals(true);
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