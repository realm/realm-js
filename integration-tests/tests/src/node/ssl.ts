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
const { X509Certificate } = await import("node:crypto");
import { Realm, SessionStopPolicy, SSLConfiguration, SSLVerifyObject } from "realm";

import { createPromiseHandle } from "../utils/promise-handle";
import { authenticateUserBefore, importAppBefore } from "../hooks";
import { PersonSchema } from "../schemas/person-and-dog-with-object-ids";

// Note:
// The rest of the SSL sync config tests are located in `integration-tests/tests/src/tests/sync/ssl.ts`.

describe.skipIf(environment.missingServer, "SSL Configuration on Node", function () {
  this.longTimeout();
  importAppBefore("with-db-flx");
  authenticateUserBefore();

  it("can verify the server's public key from the SSL certificate", async function (this: RealmContext) {
    const validateHandle = createPromiseHandle();

    const ssl: SSLConfiguration = {
      validate: true,
      certificatePath: undefined,
      validateCertificates: (verifyObject: SSLVerifyObject) => {
        const x509 = new X509Certificate(verifyObject.pemCertificate);
        // Verify that the certificate was signed by the given public key.
        const verified = x509.verify(x509.publicKey);
        if (verified) {
          validateHandle.resolve();
        } else {
          validateHandle.reject("The x509 certificate is invalid.");
        }
        return true;
      },
    };

    await Realm.open({
      schema: [PersonSchema],
      // @ts-expect-error Internal field (`_sessionStopPolicy`)
      sync: {
        user: this.app.currentUser,
        flexible: true,
        ssl,
        _sessionStopPolicy: SessionStopPolicy.Immediately,
      },
    });

    await expect(validateHandle.promise).to.not.be.rejected;
  });
});
