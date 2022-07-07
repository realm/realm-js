////////////////////////////////////////////////////////////////////////////
//
// Copyright 2021 Realm Inc.
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

import { ObjectId } from "bson";
import { expect } from "chai";
import Realm, { BSON, ClientResetMode, SessionStopPolicy } from "realm";
import { authenticateUserBefore, importAppBefore } from "../../hooks";
import { Dog, DogSchema, PersonSchema } from "../../schemas/person-and-dog-with-object-ids";
import { delay } from "../../utils/delay";

import { expectClientResetError } from "../../utils/expect-sync-error";
import { openRealm } from "../../utils/open-realm";

describe.skipIf(environment.missingServer, "client reset handling", function () {
  importAppBefore("with-db");
  authenticateUserBefore();

  it("handles manual client resets with partition-based sync enabled", async function (this: RealmContext) {
    await expectClientResetError(
      {
        schema: [PersonSchema, DogSchema],
        sync: {
          _sessionStopPolicy: SessionStopPolicy.Immediately,
          partitionValue: "client-reset-test",
          user: this.user,
          clientReset: {
            mode: ClientResetMode.Manual,
          },
        },
      },
      this.user,
      (realm) => {
        const session = realm.syncSession;
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore calling undocumented method _simulateError
        session._simulateError(211, "Simulate Client Reset", "realm::sync::ProtocolError", false); // 211 -> diverging histories
      },
      (error) => {
        expect(error.name).to.equal("ClientReset");
        expect(error.message).to.equal("Simulate Client Reset");
        expect(error.code).to.equal(211);
      },
    );
  });

  it("client reset fails, the error handler is called", async function (this: RealmContext) {
    // if client reset fails, the error handler is called
    // and the two before/after handlers are not called
    // we simulate the failure by error code 132")

    let beforeCalled = false;
    let afterCalled = false;
    let errorCalled = false;

    const { config, realm } = await openRealm(
      {
        schema: [PersonSchema, DogSchema],
        sync: {
          partitionValue: "client-reset-test",
          error: () => {
            errorCalled = true;
          },
          clientReset: {
            mode: ClientResetMode.DiscardLocal,
            clientResetBefore: () => {
              beforeCalled = true;
            },
            clientResetAfter: () => {
              afterCalled = true;
            },
          },
        },
      },
      this.user,
    );

    const session = realm.syncSession;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore calling undocumented method _simulateError
    session._simulateError(132, "Simulate Client Reset", "realm::sync::ProtocolError", true); // 132 -> automatic client reset failed

    await delay(1000);

    expect(beforeCalled).to.be.false;
    expect(afterCalled).to.be.false;
    expect(errorCalled).to.be.true;
  });

  it("handles discard local client reset with partition-based sync enabled", async function (this: RealmContext) {
    // (i)   using a client reset in "DiscardLocal" mode, a fresh copy
    //       of the Realm will be downloaded (resync)
    // (ii)  two callback will be called, while the sync error handler is not
    // (iii) after the reset, the Realm can be used as before

    let beforeCalled = false;
    let afterCalled = false;

    const { config, realm } = await openRealm(
      {
        schema: [PersonSchema, DogSchema],
        sync: {
          partitionValue: "client-reset-test",
          clientReset: {
            mode: ClientResetMode.DiscardLocal,
            clientResetBefore: (realm) => {
              beforeCalled = true;
              expect(realm.objects(DogSchema.name).length).to.equal(1);
            },
            clientResetAfter: (beforeRealm, afterRealm) => {
              afterCalled = true;
              expect(beforeRealm.objects(DogSchema.name).length).to.equal(1);
              expect(afterRealm.objects(DogSchema.name).length).to.equal(1);
            },
          },
        },
      },
      this.user,
    );

    realm.write(() => {
      realm.create(DogSchema.name, { _id: new ObjectId(), name: "Lassy", age: 5 });
    });

    const session = realm.syncSession;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore calling undocumented method _simulateError
    session._simulateError(211, "Simulate Client Reset", "realm::sync::ProtocolError", false); // 211 -> diverging histories

    await delay(1000);

    expect(beforeCalled).to.be.true;
    expect(afterCalled).to.be.true;
    expect(realm.objects(DogSchema.name).length).to.equal(1);
  });
});
