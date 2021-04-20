import { expect } from "chai";
import { App, Credentials, User } from "realm";

import { importApp } from "../../utils/import-app";

describe.skipIf("localOnly", "anonymous credentials", () => {
  let app: App;
  
  before(async function() {
    app = await importApp("simple");
  });

  it.skip("authenticates", async function() {
    const credentials = Credentials.anonymous();
    const user = await app.logIn(credentials);
    expect(user).instanceOf(User);
  });
});
