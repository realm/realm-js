import { execSync } from "child_process";

describe("Clean exit for Node.js scripts", () => {
  // Repro for https://github.com/realm/realm-js/issues/4535 - currently still failing
  it.skip("exits cleanly when creating a new Realm.App", () => {
    execSync(
      `node -e 'const Realm = require("realm"); const app = new Realm.App({ id: "myapp-abcde" }); Realm.clearTestState();'`,
      {
        timeout: 5000,
      },
    );
  });
});
