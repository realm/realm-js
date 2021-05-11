import { expect } from "chai";
import { Credentials, User } from "realm";

import { importAppBefore, TestWithApp } from "../../utils/import-app";

describe.skipIf(environment.missingServer, "anonymous credentials", () => {
  importAppBefore("simple");

  it("authenticates", async function(this: TestWithApp) {
    const credentials = Credentials.anonymous();
    const user = await this.app.logIn(credentials);
    expect(user).instanceOf(User);
  });
});
