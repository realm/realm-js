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
import { Realm, ClientResetMode, SessionStopPolicy } from "realm";
import { authenticateUserBefore, importAppBefore } from "../../hooks";
import { DogSchema, PersonSchema } from "../../schemas/person-and-dog-with-object-ids";
import { expectClientResetError } from "../../utils/expect-sync-error";
import { createPromiseHandle } from "../../utils/promise-handle";

const FlexiblePersonSchema = { ...PersonSchema, properties: { ...PersonSchema.properties, nonQueryable: "string?" } };
const FlexibleDogSchema = { ...DogSchema, properties: { ...DogSchema.properties, nonQueryable: "string?" } };

/**
 * Adds required subscriptions
 *
 * @param realm Realm instance
 */
function addSubscriptions(realm: Realm): void {
  const subs = realm.subscriptions;
  subs.update((mutableSubs: Realm.App.Sync.MutableSubscriptionSet) => {
    mutableSubs.add(realm.objects(FlexiblePersonSchema.name));
    mutableSubs.add(realm.objects(FlexibleDogSchema.name));
  });
}

function getPartitionValue() {
  return new UUID().toHexString();
}

async function triggerClientReset(app: App, user: User): Promise<void> {
  await user.functions.triggerClientReset(app.id, user.id);
}

async function waitServerSideClientResetDiscardUnsyncedChangesCallbacks(
  useFlexibleSync: boolean,
  schema: Realm.ObjectSchema[],
  app: App,
  user: User,
  actionBefore: (realm: Realm) => void,
  actionAfter: (beforeRealm: Realm, afterRealm: Realm) => void,
): Promise<void> {
  const resetHandle = createPromiseHandle();
  let afterCalled = false;
  let beforeCalled = false;
  const config: Configuration = {
    schema,
    sync: {
      user,
      _sessionStopPolicy: SessionStopPolicy.Immediately,
      ...(useFlexibleSync ? { flexible: true } : { partitionValue: getPartitionValue() }),
      clientReset: {
        mode: ClientResetMode.DiscardUnsyncedChanges,
        onAfter: (before: Realm, after: Realm) => {
          afterCalled = true;
          actionAfter(before, after);
          if (beforeCalled) {
            resetHandle.resolve();
          }
        },
        onBefore: (realm: Realm) => {
          beforeCalled = true;
          actionBefore(realm);
          if (afterCalled) {
            resetHandle.resolve();
          }
        },
      },
    },
  };
  const realm = new Realm(config);
  if (useFlexibleSync) {
    addSubscriptions(realm);
  }
  realm.write(() => {
    realm.create(DogSchema.name, { _id: new ObjectId(), name: "Rex", age: 2 });
  });

  await realm.syncSession?.uploadAllLocalChanges();
  await triggerClientReset(app, user);
  await resetHandle.promise;
}

async function waitServerSideClientResetRecoveryCallbacks(
  useFlexibleSync: boolean,
  schema: Realm.ObjectSchema[],
  app: App,
  user: User,
  actionBefore: (realm: Realm) => void,
  actionAfter: (beforeRealm: Realm, afterRealm: Realm) => void,
): Promise<void> {
  const resetHandle = createPromiseHandle();
  let afterCalled = false;
  let beforeCalled = false;

  const config: Configuration = {
    schema,
    sync: {
      user,
      _sessionStopPolicy: SessionStopPolicy.Immediately,
      ...(useFlexibleSync ? { flexible: true } : { partitionValue: getPartitionValue() }),
      clientReset: {
        mode: ClientResetMode.RecoverUnsyncedChanges,
        onAfter: (before: Realm, after: Realm) => {
          afterCalled = true;
          actionAfter(before, after);
          if (beforeCalled) {
            resetHandle.resolve();
          }
        },
        onBefore: (realm: Realm) => {
          beforeCalled = true;
          actionBefore(realm);
          if (afterCalled) {
            resetHandle.resolve();
          }
        },
      },
    },
  };
  const realm = new Realm(config);
  if (useFlexibleSync) {
    addSubscriptions(realm);
  }
  realm.write(() => {
    realm.create(DogSchema.name, { _id: new ObjectId(), name: "Rex", age: 2 });
  });

  await realm.syncSession?.uploadAllLocalChanges();
  await triggerClientReset(app, user);
  await resetHandle.promise;
}

async function waitSimulatedClientResetDiscardUnsyncedChangesCallbacks(
  useFlexibleSync: boolean,
  schema: Realm.ObjectSchema[],
  user: User,
  actionBefore: (realm: Realm) => void,
  actionAfter: (beforeRealm: Realm, afterRealm: Realm) => void,
): Promise<void> {
  return new Promise((resolve) => {
    let afterCalled = false;
    let beforeCalled = false;

    const modifiedConfig: Configuration = {
      schema,
      sync: {
        user,
        _sessionStopPolicy: SessionStopPolicy.Immediately,
        ...(useFlexibleSync ? { flexible: true } : { partitionValue: getPartitionValue() }),
        clientReset: {
          mode: ClientResetMode.DiscardUnsyncedChanges,
          onAfter: (before: Realm, after: Realm) => {
            afterCalled = true;
            actionAfter(before, after);
            if (beforeCalled) {
              resolve();
            }
          },
          onBefore: (realm: Realm) => {
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
    if (useFlexibleSync) {
      addSubscriptions(realm);
    }
    realm.write(() => {
      realm.create(DogSchema.name, { _id: new ObjectId(), name: "Rex", age: 2 });
    });
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const session = realm.syncSession;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore calling undocumented method _simulateError
    session._simulateError(211, "Simulate Client Reset", "realm::sync::ProtocolError", false); // 211 -> diverging histories
  });
}

async function waitSimulatedClientResetRecoverCallbacks(
  useFlexibleSync: boolean,
  schema: Realm.ObjectSchema[],
  user: User,
  actionBefore: (realm: Realm) => void,
  actionAfter: (beforeRealm: Realm, afterRealm: Realm) => void,
): Promise<void> {
  return new Promise((resolve) => {
    let afterCalled = false;
    let beforeCalled = false;

    const modifiedConfig: Configuration = {
      schema,
      sync: {
        user,
        _sessionStopPolicy: SessionStopPolicy.Immediately,
        ...(useFlexibleSync ? { flexible: true } : { partitionValue: getPartitionValue() }),
        clientReset: {
          mode: ClientResetMode.RecoverUnsyncedChanges,
          onAfter: (before: Realm, after: Realm) => {
            afterCalled = true;
            actionAfter(before, after);
            if (beforeCalled) {
              resolve();
            }
          },
          onBefore: (realm: Realm) => {
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
    if (useFlexibleSync) {
      addSubscriptions(realm);
    }
    realm.write(() => {
      realm.create(DogSchema.name, { _id: new ObjectId(), name: "Rex", age: 2 });
    });
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const session = realm.syncSession!;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore calling undocumented method _simulateError
    session._simulateError(211, "Simulate Client Reset", "realm::sync::ProtocolError", false); // 211 -> diverging histories; 217 -> synchronization no longer possible for client-side file
  });
}

/**
 * Returns a string representation of the type of sync
 * @param useFlexibleSync
 * @returns a string representation of flexible or partition-based sync
 */
function getPartialTestTitle(useFlexibleSync: boolean) {
  if (useFlexibleSync) {
    return "flexible";
  } else {
    return "partition-based";
  }
}

/**
 * Returns the object schemas depending on sync type
 * @param useFlexibleSync
 * @returns a schema matching either flexible or partition-based sync
 */
function getSchema(useFlexibleSync: boolean) {
  if (useFlexibleSync) {
    return [FlexiblePersonSchema, DogSchema];
  } else {
    return [PersonSchema, DogSchema];
  }
}

// FIXME: testing flexible sync is currently disabled as it is timing out
[false /*, true*/].forEach((useFlexibleSync) => {
  describe.skipIf(
    environment.missingServer,
    `client reset handling (${getPartialTestTitle(useFlexibleSync)} sync)`,
    function () {
      this.timeout(100 * 1000); // client reset with flexible sync can take quite some time
      importAppBefore(useFlexibleSync ? "with-db-flx" : "with-db");
      authenticateUserBefore();

      it(`manual client reset requires either error handler, client reset callback or both (${getPartialTestTitle(
        useFlexibleSync,
      )} sync)`, async function (this: RealmContext) {
        const config: Configuration = {
          schema: getSchema(useFlexibleSync),
          sync: {
            _sessionStopPolicy: SessionStopPolicy.Immediately,
            ...(useFlexibleSync ? { flexible: true } : { partitionValue: getPartitionValue() }),
            user: this.user,
            clientReset: {
              mode: ClientResetMode.Manual,
            },
          },
        };

        expect(() => new Realm(config)).throws();
      });

      it(`handles manual simulated client resets with ${getPartialTestTitle(
        useFlexibleSync,
      )} sync enabled`, async function (this: RealmContext) {
        await expectClientResetError(
          {
            schema: getSchema(useFlexibleSync),
            sync: {
              _sessionStopPolicy: SessionStopPolicy.Immediately,
              ...(useFlexibleSync ? { flexible: true } : { partitionValue: getPartitionValue() }),
              user: this.user,
              clientReset: {
                mode: ClientResetMode.Manual,
              },
            },
          },
          this.user,
          (realm) => {
            if (useFlexibleSync) {
              addSubscriptions(realm);
            }
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

      it(`handles manual simulated client resets by callback with ${getPartialTestTitle(
        useFlexibleSync,
      )} sync enabled`, async function (this: RealmContext) {
        return new Promise<void>((resolve, _) => {
          const config: Configuration = {
            schema: getSchema(useFlexibleSync),
            sync: {
              _sessionStopPolicy: SessionStopPolicy.Immediately,
              ...(useFlexibleSync ? { flexible: true } : { partitionValue: getPartitionValue() }),
              user: this.user,
              clientReset: {
                mode: ClientResetMode.Manual,
                onManual: (session: Realm.App.Sync.Session, path: string) => {
                  expect(session).to.be.not.null;
                  expect(path).to.not.empty;
                  resolve();
                },
              },
            },
          };

          const realm = new Realm(config);
          if (useFlexibleSync) {
            addSubscriptions(realm);
          }
          const session = realm.syncSession;
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore calling undocumented method _simulateError
          session._simulateError(211, "Simulate Client Reset", "realm::sync::ProtocolError", true); // 211 -> diverging histories
        });
      });

      it(`handles manual simulated client resets by callback from error handler with ${getPartialTestTitle(
        useFlexibleSync,
      )} sync enabled`, async function (this: RealmContext) {
        return new Promise((resolve, reject) => {
          const config: Configuration = {
            schema: getSchema(useFlexibleSync),
            sync: {
              _sessionStopPolicy: SessionStopPolicy.Immediately,
              ...(useFlexibleSync ? { flexible: true } : { partitionValue: getPartitionValue() }),
              user: this.user,
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              onError: (_) => {
                reject();
              },
              clientReset: {
                mode: ClientResetMode.Manual,
                onManual: (session, path) => {
                  expect(session).to.be.not.null;
                  expect(path).to.not.empty;
                  resolve();
                },
              },
            },
          };

          const realm = new Realm(config);
          const session = realm.syncSession;
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore calling undocumented method _simulateError
          session._simulateError(211, "Simulate Client Reset", "realm::sync::ProtocolError", true); // 211 -> diverging histories
        });
      });

      it(`client reset fails, the error handler is called (${getPartialTestTitle(
        useFlexibleSync,
      )})`, async function (this: RealmContext) {
        // if client reset fails, the error handler is called
        // and the two before/after handlers are not called
        // we simulate the failure by error code 132")

        return new Promise((resolve, reject) => {
          const config: Configuration = {
            schema: getSchema(useFlexibleSync),
            sync: {
              user: this.user,
              ...(useFlexibleSync ? { flexible: true } : { partitionValue: getPartitionValue() }),
              onError: () => {
                resolve();
              },
              clientReset: {
                mode: ClientResetMode.DiscardUnsyncedChanges,
                onBefore: () => {
                  reject();
                },
                onAfter: () => {
                  reject();
                },
              },
            },
          };

          const realm = new Realm(config);
          if (useFlexibleSync) {
            addSubscriptions(realm);
          }
          const session = realm.syncSession;
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore calling undocumented method _simulateError
          session._simulateError(132, "Simulate Client Reset", "realm::sync::ProtocolError", true); // 132 -> automatic client reset failed
        });
      });

      it(`handles discard local simulated client reset with ${getPartialTestTitle(
        useFlexibleSync,
      )} sync enabled`, async function (this: RealmContext) {
        // (i)   using a client reset in "DiscardUnsyncedChanges" mode, a fresh copy
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

        await waitSimulatedClientResetDiscardUnsyncedChangesCallbacks(
          useFlexibleSync,
          getSchema(useFlexibleSync),
          this.user,
          clientResetBefore,
          clientResetAfter,
        );
      });

      it(`handles simulated client reset with recovery with ${getPartialTestTitle(
        useFlexibleSync,
      )} sync enabled`, async function (this: RealmContext) {
        const clientResetBefore = (realm: Realm): void => {
          expect(realm.objects(DogSchema.name).length).to.equal(1);
        };
        const clientResetAfter = (beforeRealm: Realm, afterRealm: Realm) => {
          expect(beforeRealm.objects(DogSchema.name).length).to.equal(1);
          expect(afterRealm.objects(DogSchema.name).length).to.equal(1);
        };

        await waitSimulatedClientResetRecoverCallbacks(
          useFlexibleSync,
          getSchema(useFlexibleSync),
          this.user,
          clientResetBefore,
          clientResetAfter,
        );
      });

      it.skip(`handles discard local client reset with ${getPartialTestTitle(
        useFlexibleSync,
      )} sync enabled`, async function (this: RealmContext) {
        // (i)   using a client reset in "DiscardUnsyncedChanges" mode, a fresh copy
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

        await waitServerSideClientResetDiscardUnsyncedChangesCallbacks(
          useFlexibleSync,
          getSchema(useFlexibleSync),
          this.app,
          this.user,
          clientResetBefore,
          clientResetAfter,
        );
      });

      it.skip(`handles recovery client reset with ${getPartialTestTitle(
        useFlexibleSync,
      )} sync enabled`, async function (this: RealmContext) {
        // (i)   using a client reset in "Recovery" mode, a fresh copy
        //       of the Realm will be downloaded (resync)
        // (ii)  two callback will be called, while the sync error handler is not
        // (iii) after the reset, the Realm can be used as before
        this.timeout(900 * 1000);
        const clientResetBefore = (realm: Realm) => {
          expect(realm.objects(DogSchema.name).length).to.equal(1);
        };
        const clientResetAfter = (beforeRealm: Realm, afterRealm: Realm) => {
          expect(beforeRealm.objects(DogSchema.name).length).to.equal(1);
          expect(afterRealm.objects(DogSchema.name).length).to.equal(1);
        };

        await waitServerSideClientResetRecoveryCallbacks(
          useFlexibleSync,
          getSchema(useFlexibleSync),
          this.app,
          this.user,
          clientResetBefore,
          clientResetAfter,
        );
      });
    },
  );
});
