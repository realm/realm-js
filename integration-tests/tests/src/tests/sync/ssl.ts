////////////////////////////////////////////////////////////////////////////
//
// Copyright 2023 Realm Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
////////////////////////////////////////////////////////////////////////////

import { expect } from "chai";
import {
  ConfigurationWithSync,
  Credentials,
  ProgressRealmPromise,
  Realm,
  SessionStopPolicy,
  SSLConfiguration,
  SSLVerifyObject,
  User,
} from "realm";

import { getStringifiedId } from "../../utils/strings";
import { importAppBefore } from "../../hooks";
import { PersonSchema } from "../../schemas/person-and-dog-with-object-ids";

describe.skipIf(environment.missingServer, "SSL Configuration", function () {
  // this.timeout(60_000); // TODO: Temporarily hardcoded until this.longTimeout() is available.
  importAppBefore("with-db");

  async function logIn(app: App): Promise<User> {
    return app.currentUser ?? app.logIn(Credentials.anonymous());
  }

  async function logOut(app: App): Promise<void> {
    app.currentUser?.logOut();
  }

  function openRealm(user: User, ssl: SSLConfiguration): ProgressRealmPromise {
    const config: ConfigurationWithSync = {
      schema: [PersonSchema],
      sync: {
        user,
        partitionValue: getStringifiedId(),
        ssl,
        // @ts-expect-error Internal method
        _sessionStopPolicy: SessionStopPolicy.Immediately,
        // TODO: May not need this handler
        onError: (session, error) => {
          console.log("onError:", error);
        },
      },
    };

    return Realm.open(config); // TODO: Do we want to use new Realm() instead of ProgressRealmPromise?
  }

  beforeEach(async function (this: AppContext & Mocha.Context) {
    await logIn(this.app);
  });

  afterEach(async function (this: AppContext & Mocha.Context) {
    await logOut(this.app);
  });

  it("can access SSL configuration after realm is opened", async function (this: RealmContext) {
    // TODO
    throw new Error("Test not yet implemented.");
  });

  it("<description of expected behavior when accepting the server's SSL certificate (e.g. connects)>", async function (this: RealmContext) {
    // TODO
    throw new Error("Test not yet implemented.");

    // await new Promise<void>((resolve, reject) => {
    //   // ...
    // });

    const ssl: SSLConfiguration = {
      validate: true,
      certificatePath: "somePath",
      validateCertificates: (arg: SSLVerifyObject) => {
        console.log("VALIDATE CERTIFICATES");
        console.log(arg);
        return true;
      },
    };
    const realm = await openRealm(this.app.currentUser, ssl);
    console.log(realm.syncSession?.config.ssl);

    expect(realm.syncSession?.isConnected()).to.be.true;
  });

  it("<description of expected behavior when rejecting the server's SSL certificate (e.g. does not connect)>", async function (this: RealmContext) {
    // TODO
    throw new Error("Test not yet implemented.");
  });

  it("gets called with an SSLVerifyObject", async function (this: RealmContext) {
    // TODO
    throw new Error("Test not yet implemented.");
  });

  // TODO:
  // - Test variations of:
  //   - ssl.validate
  //   - ssl.certificatePath
});
