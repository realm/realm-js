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
  ConnectionState,
  Credentials,
  ErrorCallback,
  ProgressRealmPromise,
  Realm,
  SessionStopPolicy,
  SSLConfiguration,
  SSLVerifyObject,
  User,
} from "realm";

import { closeRealm } from "../../utils/close-realm";
import { createPromiseHandle } from "../../utils/promise-handle";
import { importAppBefore } from "../../hooks";
import { PersonSchema } from "../../schemas/person-and-dog-with-object-ids";

// Note:
// The SSL sync config tests that depend on node:crypto are located in `integration-tests/tests/src/node/ssl.ts`.

describe.skipIf(environment.missingServer, "SSL Configuration", function () {
  this.longTimeout();
  importAppBefore("with-db-flx");

  async function logIn(app: App): Promise<User> {
    return app.currentUser ?? app.logIn(Credentials.anonymous());
  }

  async function logOut(app: App): Promise<void> {
    return app.currentUser?.logOut();
  }

  function openRealm(user: User, ssl: SSLConfiguration, onError?: ErrorCallback): ProgressRealmPromise {
    const config: ConfigurationWithSync = {
      schema: [PersonSchema],
      sync: {
        user,
        flexible: true,
        ssl,
        onError,
        // @ts-expect-error Internal field
        _sessionStopPolicy: SessionStopPolicy.Immediately,
      },
    };

    // TODO: Do we want to use `new Realm()` instead of ProgressRealmPromise?
    return Realm.open(config);
  }

  beforeEach(async function (this: AppContext & Mocha.Context) {
    await logIn(this.app);
  });

  afterEach(async function (this: AppContext & Mocha.Context) {
    await logOut(this.app);
  });

  it("connects when accepting the server's SSL certificate", async function (this: RealmContext) {
    const connectionHandle = createPromiseHandle();
    let validationFunctionCalled = false;

    const ssl: SSLConfiguration = {
      validate: true,
      certificatePath: undefined,
      validateCertificates: (verifyObject: SSLVerifyObject) => {
        console.log("VALIDATING CERTIFICATES...");
        console.log({ verifyObject });

        validationFunctionCalled = true;

        // Accept the certificate.
        return true;
      },
    };

    const realm = await openRealm(this.app.currentUser, ssl);
    realm.syncSession?.addConnectionNotification((newState, oldState) => {
      // TODO: See what combination of oldState and newState correctly indicates
      //       when we should call validateHandle.resolve().

      console.log({ oldState, newState });
      // or could the old state be `Connected` || `Connecting` instead of just `Connected`?
      if (oldState === ConnectionState.Connected && newState === ConnectionState.Disconnected) {
        connectionHandle.resolve();
      }
    });

    await connectionHandle.promise;
    expect(validationFunctionCalled).to.be.true;
    expect(realm.syncSession?.isConnected()).to.be.true;
    console.log({ ssl: realm.syncSession?.config.ssl });
    expect(realm.syncSession?.config.ssl).to.deep.equal({ validate: true }); // or: { validate: true, certificatePath: undefined }

    closeRealm(realm);

    // Need to be able to validate that onError has not been called. Since we cannot
    // await onError (since we're not expecting it to be called), how can we know with
    // certainty that it didn't get called?
  });

  it("does not connect when rejecting the server's SSL certificate", async function (this: RealmContext) {
    const onErrorHandle = createPromiseHandle();

    const ssl: SSLConfiguration = {
      validate: true,
      certificatePath: undefined,
      validateCertificates: (verifyObject: SSLVerifyObject) => {
        console.log("VALIDATING CERTIFICATES...");
        console.log({ verifyObject });

        // Reject the certificate.
        return false;
      },
    };

    const onError: ErrorCallback = (session, error) => {
      console.log("In onError:");
      console.log({ error });

      if (error.message === "SSL server certificate rejected") {
        onErrorHandle.resolve();
      } else {
        onErrorHandle.reject(`Expected the error to be an SSL server certificate rejection, got: ${error.message}`);
      }
    };

    const realm = await openRealm(this.app.currentUser, ssl, onError);

    await expect(onErrorHandle.promise).to.not.be.rejected;
    expect(realm.syncSession?.isConnected()).to.be.false;

    closeRealm(realm);
  });

  it("calls the certificate validation callback with an SSLVerifyObject", async function (this: RealmContext) {
    const validateHandle = createPromiseHandle();

    const ssl: SSLConfiguration = {
      validate: true,
      certificatePath: undefined,
      validateCertificates: (verifyObject: SSLVerifyObject) => {
        console.log("VALIDATING CERTIFICATES...");
        console.log({ verifyObject });

        try {
          // expect(verifyObject).to.be.an("object");
          // expect(verifyObject.serverAddress).to.be.a("string");
          // expect(verifyObject.serverPort).to.be.a("number");
          // expect(verifyObject.pemCertificate).to.be.a("string");
          // expect(verifyObject.acceptedByOpenSSL).to.be.a("boolean");
          // expect(verifyObject.depth).to.be.a("number");

          const { serverAddress, serverPort, pemCertificate, acceptedByOpenSSL, depth } = verifyObject;
          let errMessage = "";
          if (typeof serverAddress !== "string") {
            errMessage += `Expected 'verifyObject.serverAddress' to be a string, got ${typeof serverAddress}\n`;
          }
          if (typeof serverPort !== "number" || isNaN(serverPort)) {
            errMessage += `Expected 'verifyObject.serverPort' to be a number, got ${typeof serverPort}\n`;
          }
          if (typeof pemCertificate !== "string") {
            errMessage += `Expected 'verifyObject.pemCertificate' to be a string, got ${typeof pemCertificate}\n`;
          }
          if (typeof acceptedByOpenSSL !== "boolean") {
            errMessage += `Expected 'verifyObject.acceptedByOpenSSL' to be a boolean, got ${typeof acceptedByOpenSSL}\n`;
          }
          if (typeof depth !== "number" || isNaN(depth)) {
            errMessage += `Expected 'verifyObject.depth' to be a number, got ${typeof depth}\n`;
          }

          if (errMessage) {
            throw new Error(errMessage);
          }

          validateHandle.resolve();
        } catch (err: any) {
          validateHandle.reject(err.message);
        }

        return true;
      },
    };

    const realm = await openRealm(this.app.currentUser, ssl);

    await expect(validateHandle.promise).to.not.be.rejected;

    closeRealm(realm);
  });

  describe("validate config object", function () {
    it("throws when config is not an object", async function (this: RealmContext) {
      const invalidSSL = "not an object";
      // @ts-expect-error Testing invalid type
      await expect(openRealm(this.app.currentUser, invalidSSL)).to.be.rejectedWith(
        "Expected 'ssl' on realm sync configuration to be an object, got a string",
      );
    });

    it("throws when containing invalid type for property 'validate'", async function (this: RealmContext) {
      const invalidSSL = { validate: "not a boolean" };
      // @ts-expect-error Testing invalid type
      await expect(openRealm(this.app.currentUser, invalidSSL)).to.be.rejectedWith(
        "Expected 'ssl.validate' on realm sync configuration to be a boolean, got a string",
      );
    });

    it("throws when containing invalid type for property 'certificatePath'", async function (this: RealmContext) {
      const invalidSSL = { certificatePath: 1 };
      // @ts-expect-error Testing invalid type
      await expect(openRealm(this.app.currentUser, invalidSSL)).to.be.rejectedWith(
        "Expected 'ssl.certificatePath' on realm sync configuration to be a string, got a number",
      );
    });

    it("throws when containing invalid type for property 'validateCertificates'", async function (this: RealmContext) {
      const invalidSSL = { validateCertificates: "not a function" };
      // @ts-expect-error Testing invalid type
      await expect(openRealm(this.app.currentUser, invalidSSL)).to.be.rejectedWith(
        "Expected 'ssl.validateCertificates' on realm sync configuration to be a function, got a string",
      );
    });
  });
});
