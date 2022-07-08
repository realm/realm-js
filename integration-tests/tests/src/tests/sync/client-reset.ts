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

import { ObjectId, UUID } from "bson";
import { expect } from "chai";
import Realm, { ClientResetMode, SessionStopPolicy } from "realm";
import { authenticateUserBefore, importAppBefore } from "../../hooks";
import { DogSchema, PersonSchema } from "../../schemas/person-and-dog-with-object-ids";
import { expectClientResetError } from "../../utils/expect-sync-error";

function getPartitionValue() {
  return new UUID().toHexString();
}

async function waitClientResetCallbacks(
  schema: Realm.ObjectSchema[],
  user: Realm.User,
  mode: Realm.ClientResetMode,
  actionBefore: (realm: Realm) => void,
  actionAfter: (beforeRealm: Realm, afterRealm: Realm, didRecover: boolean) => void,
): Promise<void> {
  return new Promise((resolve) => {
    let afterCalled = false;
    let beforeCalled = false;

    // Shallow copy the sync configuration to modifying the original
    const modifiedConfig: Realm.Configuration = {
      schema,
      sync: {
        user,
        _sessionStopPolicy: SessionStopPolicy.Immediately,
        partitionValue: getPartitionValue(),
        clientReset: {
          mode,
          clientResetAfter: (before: Realm, after: Realm, recover: boolean) => {
            afterCalled = true;
            actionAfter(before, after, recover);
            if (beforeCalled) {
              resolve();
            }
          },
          clientResetBefore: (realm: Realm) => {
            beforeCalled = true;
            actionBefore(realm);
            if (afterCalled) {
              resolve();
            }
          },
        },
      },
    };

    const realm = new Realm(modifiedConfig);
    realm.write(() => {
      realm.create(DogSchema.name, { _id: new ObjectId(), name: "Rex", age: 2 });
    });
    const session = realm.syncSession;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore calling undocumented method _simulateError
    session._simulateError(211, "Simulate Client Reset", "realm::sync::ProtocolError", false); // 211 -> diverging histories
  });
}

describe.skipIf(environment.missingServer, "client reset handling", function () {
  importAppBefore("with-db");
  authenticateUserBefore();

  it("handles manual client resets with partition-based sync enabled", async function (this: RealmContext) {
    await expectClientResetError(
      {
        schema: [PersonSchema, DogSchema],
        sync: {
          _sessionStopPolicy: SessionStopPolicy.Immediately,
          partitionValue: getPartitionValue(),
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

    return new Promise((resolve, reject) => {
      const config = {
        schema: [PersonSchema, DogSchema],
        sync: {
          user: this.user,
          partitionValue: getPartitionValue(),
          error: () => {
            resolve();
          },
          clientReset: {
            mode: ClientResetMode.DiscardLocal,
            clientResetBefore: () => {
              reject();
            },
            clientResetAfter: () => {
              reject();
            },
          },
        },
      };

      const realm = new Realm(config);
      const session = realm.syncSession;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore calling undocumented method _simulateError
      session._simulateError(132, "Simulate Client Reset", "realm::sync::ProtocolError", true); // 132 -> automatic client reset failed
    });
  });

  it("handles discard local client reset with partition-based sync enabled", async function (this: RealmContext) {
    // (i)   using a client reset in "DiscardLocal" mode, a fresh copy
    //       of the Realm will be downloaded (resync)
    // (ii)  two callback will be called, while the sync error handler is not
    // (iii) after the reset, the Realm can be used as before

    const clientResetBefore = (realm: Realm) => {
      expect(realm.objects(DogSchema.name).length).to.equal(1);
    };
    const clientResetAfter = (beforeRealm: Realm, afterRealm: Realm) => {
      expect(beforeRealm.objects(DogSchema.name).length).to.equal(1);
      expect(afterRealm.objects(DogSchema.name).length).to.equal(1);
    };

    await waitClientResetCallbacks(
      [PersonSchema, DogSchema],
      this.user,
      Realm.ClientResetMode.DiscardLocal,
      clientResetBefore,
      clientResetAfter,
    );
  });

  it("handles client reset with recovery with partition-based sync enabled", async function (this: RealmContext) {
    const clientResetBefore = (realm: Realm): void => {
      expect(realm.objects(DogSchema.name).length).to.equal(1);
    };
    const clientResetAfter = (beforeRealm: Realm, afterRealm: Realm, didRecover: boolean) => {
      expect(didRecover).to.be.true;
      expect(beforeRealm.objects(DogSchema.name).length).to.equal(1);
      expect(afterRealm.objects(DogSchema.name).length).to.equal(1);
    };

    console.log("ClientResetMode", Realm.ClientResetMode);
    await waitClientResetCallbacks(
      [PersonSchema, DogSchema],
      this.user,
      Realm.ClientResetMode.Recover,
      clientResetBefore,
      clientResetAfter,
    );
  });
});
