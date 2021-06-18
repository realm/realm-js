import { expect } from "chai";
import { Credentials, User } from "realm";

import { importAppBefore } from "../../hooks";

describe.skipIf(environment.missingServer, "anonymous credentials", () => {
  importAppBefore("simple");

  it("authenticates", async function(this: AppContext) {
    const credentials = Credentials.anonymous();
    const user = await this.app.logIn(credentials);
    expect(user).instanceOf(User);
  });
});
