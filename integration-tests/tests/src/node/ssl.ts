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
import { platform } from "node:os";
// If crypto support is not enabled on the Node.js build, using this lexical
// `import` keyword will throw when executed. If we want to handle such a case
// or log a certain message, use the `import()` function within a try-catch.
// See: https://nodejs.org/api/crypto.html#determining-if-crypto-support-is-unavailable
import { X509Certificate } from "node:crypto";
import Realm, {
  App,
  ConfigurationWithSync,
  Credentials,
  ErrorCallback,
  SessionStopPolicy,
  SSLConfiguration,
  SSLVerifyObject,
  User,
} from "realm";

import { PersonSchema } from "../schemas/person-and-dog-with-object-ids";
import { buildAppConfig } from "../utils/build-app-config";
import { closeRealm } from "../utils/close-realm";
import { createPromiseHandle } from "../utils/promise-handle";
import { importAppBefore } from "../hooks";

// IMPORTANT:
// * Can only run on non-Apple machines, otherwise tests will await forever.
describe.skipIf(platform() === "darwin" || environment.missingServer, "SSL Configuration", function () {
  this.longTimeout();
  importAppBefore(buildAppConfig("with-flx").anonAuth().flexibleSync());

  beforeEach(async function (this: AppContext & Mocha.Context) {
    await logIn(this.app);
  });

  afterEach(async function (this: AppContext & Mocha.Context) {
    await logOut(this.app);
  });

  async function logIn(app: App): Promise<User> {
    return app.currentUser ?? app.logIn(Credentials.anonymous());
  }

  async function logOut(app: App): Promise<void> {
    return app.currentUser?.logOut();
  }

  function openRealm(user: User, ssl: SSLConfiguration, onError?: ErrorCallback) /*: ProgressRealmPromise*/ {
    const config: ConfigurationWithSync = {
      schema: [PersonSchema],
      sync: {
        user,
        flexible: true,
        ssl,
        onError,
        // @ts-expect-error Internal field
        _sessionStopPolicy: SessionStopPolicy.Immediately,
        // == TEMPORARY ==
        cancelWaitsOnNonFatalError: true,
      },
    };

    return Realm.open(config);
  }

  it("connects when accepting the server's SSL certificate", async function (this: RealmContext) {
    let validationCallbackInvoked = false;
    const ssl: SSLConfiguration = {
      validate: true,
      certificatePath: undefined,
      validateCertificates: () => {
        validationCallbackInvoked = true;
        // Accept the certificate.
        return true;
      },
    };

    let syncErrorCallbackInvoked = false;
    const onError: ErrorCallback = () => (syncErrorCallbackInvoked = true);

    const realm = await openRealm(this.app.currentUser, ssl, onError);
    try {
      expect(realm.syncSession?.isConnected()).to.be.true;
      expect(realm.syncSession?.config.ssl).to.deep.equal({ validate: true, certificatePath: undefined });
      expect(validationCallbackInvoked).to.be.true;
      expect(syncErrorCallbackInvoked).to.be.false;
    } finally {
      closeRealm(realm);
    }
  });

  it("connects without validating the server's SSL certificate when 'validate' is 'false'", async function (this: RealmContext) {
    let validationCallbackInvoked = false;
    const ssl: SSLConfiguration = {
      validate: false,
      certificatePath: undefined,
      validateCertificates: () => (validationCallbackInvoked = true),
    };

    let syncErrorCallbackInvoked = false;
    const onError: ErrorCallback = () => (syncErrorCallbackInvoked = true);

    const realm = await openRealm(this.app.currentUser, ssl, onError);
    try {
      expect(realm.syncSession?.isConnected()).to.be.true;
      expect(realm.syncSession?.config.ssl).to.deep.equal({ validate: false, certificatePath: undefined });
      expect(validationCallbackInvoked).to.be.false;
      expect(syncErrorCallbackInvoked).to.be.false;
    } finally {
      closeRealm(realm);
    }
  });

  // TODO: Remove `only`.
  it.only("does not connect when rejecting the server's SSL certificate", async function (this: RealmContext) {
    let validationCallbackInvoked = false;
    const ssl: SSLConfiguration = {
      validate: true,
      certificatePath: undefined,
      validateCertificates: () => {
        validationCallbackInvoked = true;
        // Reject the certificate.
        return false;
      },
    };

    const onErrorHandle = createPromiseHandle();
    const onError: ErrorCallback = (_, error) => {
      // == TEMPORARY ==
      console.log("SSL ERROR CALLBACK");
      console.log({ error });
      // ===============
      const TLS_HANDSHAKE_FAILED = 1042;
      if (error.code === TLS_HANDSHAKE_FAILED) {
        console.log("TLS handshake failed");
        // throw error;
        onErrorHandle.resolve();
      } else {
        // throw new Error(`Expected the error to be a TLS handshake rejection, got: ${error.reason}`);
        onErrorHandle.reject(`Expected the error to be a TLS handshake rejection, got: ${error.reason}`);
      }
    };

    await expect(openRealm(this.app.currentUser, ssl, onError)).to.be.rejectedWith(
      "TLS handshake failed: OpenSSL error: certificate verify failed",
    );
    expect(validationCallbackInvoked).to.be.true;
    await onErrorHandle;
  });

  it("verifies the server's SSL certificate", async function (this: RealmContext) {
    let validationCallbackInvoked = false;
    const ssl: SSLConfiguration = {
      validate: true,
      certificatePath: undefined,
      validateCertificates: (verifyObject: SSLVerifyObject) => {
        validationCallbackInvoked = true;

        // The `depth` of the root certificate will be the length of the chain - 1. All
        // certificates between the root and the actual server certificate have a depth > 0.
        const isServerCertificate = verifyObject.depth === 0;
        const x509 = new X509Certificate(verifyObject.pemCertificate);

        if (verifyObject.acceptedByOpenSSL) {
          // If it's the actual server certificate, Core recommends always checking the host;
          // otherwise, if it's higher up in the chain and accepted by OpenSSL, they recommend
          // returning `true`.
          return isServerCertificate ? !!x509.checkHost(verifyObject.serverAddress) : true;
        } else {
          // If the certificate is not accepted by OpenSSL, Core recommends using an independent
          // verification step. That step is represented here by checking the dates.
          const now = new Date();
          const isValid = now >= new Date(x509.validFrom) && now <= new Date(x509.validTo);
          return isServerCertificate ? isValid && !!x509.checkHost(verifyObject.serverAddress) : isValid;
        }
      },
    };

    let syncErrorCallbackInvoked = false;
    const onError: ErrorCallback = () => (syncErrorCallbackInvoked = true);

    const realm = await openRealm(this.app.currentUser, ssl, onError);
    try {
      expect(realm.syncSession?.isConnected()).to.be.true;
      expect(realm.syncSession?.config.ssl).to.deep.equal({ validate: true, certificatePath: undefined });
      expect(validationCallbackInvoked).to.be.true;
      expect(syncErrorCallbackInvoked).to.be.false;
    } finally {
      closeRealm(realm);
    }
  });

  it("calls the certificate validation callback with an SSLVerifyObject", async function (this: RealmContext) {
    const validateHandle = createPromiseHandle();
    const ssl: SSLConfiguration = {
      validate: true,
      certificatePath: undefined,
      validateCertificates: (verifyObject: SSLVerifyObject) => {
        try {
          expect(verifyObject).to.be.an("object");
          expect(verifyObject.serverAddress).to.be.a("string");
          expect(verifyObject.serverPort).to.be.a("number");
          expect(verifyObject.pemCertificate).to.be.a("string");
          expect(verifyObject.acceptedByOpenSSL).to.be.a("boolean");
          expect(verifyObject.depth).to.be.a("number");
          validateHandle.resolve();
        } catch (err: any) {
          validateHandle.reject(err.message);
        }
        // Always returning `true` due to only testing resolved/rejected.
        return true;
      },
    };

    const realm = await openRealm(this.app.currentUser, ssl);
    try {
      await expect(validateHandle).to.not.be.rejected;
    } finally {
      closeRealm(realm);
    }
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
