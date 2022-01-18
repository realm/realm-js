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

import chaiAsPromised from "chai-as-promised";
import chai, { expect } from "chai";
import Realm, { BSON, ClientResetMode, SessionStopPolicy } from "realm";

import { authenticateUserBefore, importAppBefore, openRealmBeforeEach } from "../../hooks";
import { DogSchema, IPerson, PersonSchema } from "../../schemas/person-and-dog-with-object-ids";
import { expectClientResetError } from "../../utils/expect-sync-error";
import { SyncedConfiguration } from "../../utils/open-realm";
import { closeAndReopenRealm } from "../../utils/close-realm";

chai.use(chaiAsPromised);

const realmConfig: SyncedConfiguration = {
  schema: [PersonSchema, DogSchema],
  sync: {
    flexible: true,
  },
};

describe.skipIf(environment.missingServer, "Flexible sync", function () {
  type AddSubscriptionResult<T> = {
    subs: Realm.App.Sync.Subscriptions;
    sub: Realm.App.Sync.Subscription;
    query: Realm.Results<T & Realm.Object>;
  };

  /**
   * Add a subscription for all objects of type "Person"
   *
   * @param realm Realm instance
   * @param options Options to pass to the `mutableSubs.add` call
   * @returns Promise, resolving to an object containing the subscription set, the
   * added subscription and the query used for the subscription
   */
  function addSubscriptionForPerson(
    realm: Realm,
    options: Realm.App.Sync.SubscriptionOptions | undefined = undefined,
  ): AddSubscriptionResult<IPerson> {
    return addSubscription<IPerson>(realm, realm.objects(PersonSchema.name), options);
  }

  /**
   * Adds the specified subscription
   *
   * @param realm Realm instance
   * @param query Query to add a subscription for
   * @param options Options to pass to the `mutableSubs.add` call
   * @returns Promise, resolving to an object containing the subscription set, the
   * added subscription and the query used for the subscription
   */
  function addSubscription<
    T
  >(realm: Realm, query: Realm.Results<T & Realm.Object>, options: Realm.App.Sync.SubscriptionOptions | undefined = undefined): AddSubscriptionResult<T> {
    const subs = realm.getSubscriptions();
    let sub!: Realm.App.Sync.Subscription;

    subs.update((mutableSubs) => {
      sub = mutableSubs.add(query, options);
    });

    return { subs, sub, query };
  }

  importAppBefore("with-db-flx", {}, environment.syncLogLevel as Realm.App.Sync.LogLevel | undefined);
  authenticateUserBefore();
  openRealmBeforeEach(realmConfig);

  describe("API", function () {
    describe("flexible sync Realm config", function () {
      it("accepts a { flexible: true } option", function () {
        expect(() => {
          new Realm({
            sync: { _sessionStopPolicy: "immediately" as SessionStopPolicy, flexible: true, user: this.user },
          });
        }).to.not.throw();
      });

      it("can be constructed asynchronously", async function () {
        await expect(
          (async () => {
            Realm.open({
              sync: { _sessionStopPolicy: "immediately" as SessionStopPolicy, flexible: true, user: this.user },
            });
          })(),
        ).to.not.be.rejected;
      });

      it("does not accept { flexible: true } and a partition value", function () {
        expect(() => {
          // Cast to any as Typescript will detect this as an error
          new (Realm as any)({
            sync: {
              _sessionStopPolicy: "immediately" as SessionStopPolicy,
              flexible: true,
              user: this.user,
              partitionValue: "test",
            },
          });
        }).to.throw("'partitionValue' cannot be specified when flexible sync is enabled");
      });

      it("accepts { flexible: false } and a partition value", function () {
        expect(() => {
          new Realm({
            sync: {
              _sessionStopPolicy: "immediately" as SessionStopPolicy,
              flexible: false,
              user: this.user,
              partitionValue: "test",
            },
          });
        }).to.not.throw();
      });

      it("accepts { flexible: undefined } and a partition value", function () {
        expect(() => {
          new Realm({
            sync: {
              _sessionStopPolicy: "immediately" as SessionStopPolicy,
              flexible: undefined,
              user: this.user,
              partitionValue: "test",
            },
          });
        }).to.not.throw();
      });

      it("throws an error if flexible sync is enabled and client reset mode is discardLocal", function () {
        expect(() => {
          // Cast to any as Typescript will detect this as an error
          new (Realm as any)({
            sync: {
              _sessionStopPolicy: "immediately" as SessionStopPolicy,
              flexible: true,
              user: this.user,
              clientReset: {
                mode: "discardLocal" as ClientResetMode,
              },
            },
          });
        }).to.throw("Only manual client resets are supported with flexible sync");
      });
    });

    describe("getAllSyncSessions", function () {
      it("getAllSyncSessions returns a valid sync session for flexible sync", function (this: RealmContext) {
        const sessions = Realm.App.Sync.getAllSyncSessions(this.user);
        expect(sessions).to.have.length(1);
        expect(sessions[0].config.flexible).to.be.true;
      });
    });

    describe("Realm.getSubscriptions()", function () {
      it("returns a Subscriptions instance", function (this: RealmContext) {
        expect(this.realm.getSubscriptions()).to.be.instanceOf(Realm.App.Sync.Subscriptions);
      });

      it("throws an error if the Realm does not have a sync config", function (this: RealmContext) {
        const realm = new Realm({ schema: [PersonSchema] });
        expect(() => realm.getSubscriptions()).to.throw(
          "getSubscriptions() can only be called if flexible sync is enabled, but sync is currently disabled for your app. Specify { flexible: true } in your sync config.",
        );
      });

      it("throws an error if the Realm has a partition based sync config", function (this: RealmContext) {
        const realm = new Realm({ schema: [PersonSchema], sync: { user: this.user, partitionValue: "test" } });
        expect(() => realm.getSubscriptions()).to.throw(
          "getSubscriptions() can only be called if flexible sync is enabled, but partition based sync is currently enabled for your app. Specify { flexible: true } in your sync config and remove any `partitionValue`.",
        );
      });
    });

    describe("Subscription class", function () {
      it("has an id", function (this: RealmContext) {
        const sub = addSubscriptionForPerson(this.realm).sub;
        expect(sub.id).to.be.instanceOf(BSON.ObjectId);
      });

      it("has a createdAt date", function (this: RealmContext) {
        const sub = addSubscriptionForPerson(this.realm).sub;
        expect(sub.createdAt).to.be.instanceOf(Date);
      });

      it("has an updatedAt date", function (this: RealmContext) {
        const sub = addSubscriptionForPerson(this.realm).sub;
        expect(sub.updatedAt).to.be.instanceOf(Date);
      });

      it("has a default name", function (this: RealmContext) {
        const sub = addSubscriptionForPerson(this.realm).sub;
        expect(sub.name).to.equal(null);
      });

      it("has a specified name", function (this: RealmContext) {
        const subWithName = addSubscriptionForPerson(this.realm, { name: "test" }).sub;
        expect(subWithName.name).to.equal("test");
      });

      it("has an objectType", function (this: RealmContext) {
        const sub = addSubscriptionForPerson(this.realm).sub;
        expect(sub.objectType).to.equal(PersonSchema.name);
      });

      it("has a default queryString", function (this: RealmContext) {
        const sub = addSubscriptionForPerson(this.realm).sub;
        expect(sub.queryString).to.equal("TRUEPREDICATE");
      });

      it("has a specified queryString", function (this: RealmContext) {
        const subWithFilter = addSubscription(this.realm, this.realm.objects(PersonSchema.name).filtered("age > 10"))
          .sub;
        expect(subWithFilter.queryString).to.equal("age > 10");
      });

      it("does not include sort in the query string", function (this: RealmContext) {
        const subWithFilter = addSubscription(
          this.realm,
          this.realm.objects(PersonSchema.name).filtered("age > 10").sorted("name"),
        ).sub;
        expect(subWithFilter.queryString).to.equal("age > 10");
      });
    });

    describe("Subscriptions class", function () {
      describe("#version", function () {
        it("starts at 0", function () {
          expect(this.realm.getSubscriptions().version).to.equal(0);
        });

        it("is incremented when an update is performed", function (this: RealmContext) {
          expect(this.realm.getSubscriptions().version).to.equal(0);
          const { subs } = addSubscriptionForPerson(this.realm);
          expect(subs.version).to.equal(1);
        });

        it("is not incremented when a different Subscriptions instance is updated", function (this: RealmContext) {
          const originalSubs = this.realm.getSubscriptions();
          expect(originalSubs.version).to.equal(0);

          // orignalSubs will not be updated as we mutate a new `Subscriptions` instance here
          addSubscriptionForPerson(this.realm);
          expect(originalSubs.version).to.equal(0);
        });
      });

      describe("#empty", function () {
        it("returns true if no subscriptions exist", function (this: RealmContext) {
          expect(this.realm.getSubscriptions().empty).to.be.true;
        });

        it("returns false if subscriptions exist", function (this: RealmContext) {
          const { subs } = addSubscriptionForPerson(this.realm);

          expect(subs.empty).to.be.false;
        });

        it("returns true if a subscription is added then removed", function (this: RealmContext) {
          const subs = this.realm.getSubscriptions();
          let sub: Realm.App.Sync.Subscription;

          expect(subs.empty).to.be.true;

          subs.update((mutableSubs) => {
            sub = mutableSubs.add(this.realm.objects(PersonSchema.name));
          });

          expect(subs.empty).to.be.false;

          subs.update((mutableSubs) => {
            mutableSubs.removeSubscription(sub);
          });

          expect(subs.empty).to.be.true;
        });
      });

      describe("array-like access", function () {
        // it("returns an array", function (this: RealmContext) {
        //   const subs = this.realm.getSubscriptions();
        //   expect(subs).to.be.instanceOf(Array);
        // });

        it("returns an empty array if there are no subscriptions", function (this: RealmContext) {
          const subs = this.realm.getSubscriptions();
          expect(subs).to.have.length(0);
        });

        it("returns an array of Subscription objects", async function (this: RealmContext) {
          addSubscriptionForPerson(this.realm);
          const { subs } = addSubscription(this.realm, this.realm.objects(PersonSchema.name).filtered("age > 10"));

          expect(subs).to.have.length(2);
          expect(subs.every((s) => s instanceof Realm.App.Sync.Subscription)).to.be.true;
        });

        it("is an immutable snapshot of the subscriptions when snapshot was called", function (this: RealmContext) {
          const { subs } = addSubscriptionForPerson(this.realm);
          const snapshot = subs;
          expect(snapshot).to.have.length(1);

          addSubscription(this.realm, this.realm.objects(PersonSchema.name).filtered("age > 10"));

          expect(snapshot).to.have.length(1);
        });
      });

      describe("#findByName", function () {
        it("returns null if the named subscription does not exist", function (this: RealmContext) {
          expect(this.realm.getSubscriptions().findByName("test")).to.be.null;
        });

        it("returns the named subscription", function (this: RealmContext) {
          const { subs, sub } = addSubscriptionForPerson(this.realm, { name: "test" });

          expect(subs.findByName("test")).to.deep.equal(sub);
        });
      });

      describe("#find", function () {
        it("returns null if the query is not subscribed to", function (this: RealmContext) {
          expect(this.realm.getSubscriptions().find(this.realm.objects(PersonSchema.name))).to.be.null;
        });

        it("returns a query's subscription by reference", function (this: RealmContext) {
          const { subs, sub, query } = addSubscriptionForPerson(this.realm);

          expect(subs.find(query)).to.deep.equal(sub);
        });

        it("returns a filtered query's subscription", function (this: RealmContext) {
          const query = this.realm.objects(PersonSchema.name).filtered("age > 10");
          const { subs, sub } = addSubscription(this.realm, query);

          expect(subs.find(query)).to.deep.equal(sub);
        });

        it("returns a sorted query's subscription", function (this: RealmContext) {
          const query = this.realm.objects(PersonSchema.name).sorted("age");
          const { subs, sub } = addSubscription(this.realm, query);

          expect(subs.find(query)).to.deep.equal(sub);
        });

        it("returns a filtered and sorted query's subscription", function (this: RealmContext) {
          const query = this.realm.objects(PersonSchema.name).sorted("age");
          const { subs, sub } = addSubscription(this.realm, query);

          expect(subs.find(query)).to.deep.equal(sub);
        });

        it("returns a query with equivalent RQL respresentation's subscription", function (this: RealmContext) {
          const { subs, sub } = addSubscriptionForPerson(this.realm);

          expect(subs.find(this.realm.objects(PersonSchema.name))).to.deep.equal(sub);
        });
      });

      describe("#state", function () {
        it("is Pending by default", function (this: RealmContext) {
          const subs = this.realm.getSubscriptions();
          expect(subs.state).to.equal(Realm.App.Sync.SubscriptionsState.Pending);
        });

        it("is Complete once synchronisation is complete", async function (this: RealmContext) {
          const { subs } = addSubscriptionForPerson(this.realm);
          await subs.waitForSynchronization();

          expect(subs.state).to.equal(Realm.App.Sync.SubscriptionsState.Complete);
        });

        it("is Error if there is an error during synchronisation", async function (this: RealmContext) {
          const { subs } = addSubscription(
            this.realm,
            this.realm.objects(PersonSchema.name).filtered("nonQueryable == 'test'"),
          );

          await expect(subs.waitForSynchronization()).to.be.rejectedWith(
            'Client provided query with bad syntax: invalid match expression for table "Person": key "nonQueryable" is not a queryable field',
          );

          expect(subs.state).to.equal(Realm.App.Sync.SubscriptionsState.Error);
        });

        it("is Superceded if another update is synchronised after this one", async function (this: RealmContext) {
          const { subs } = addSubscriptionForPerson(this.realm);
          await subs.waitForSynchronization();

          const { subs: newSubs } = addSubscriptionForPerson(this.realm);
          await newSubs.waitForSynchronization();
          await subs.waitForSynchronization();

          expect(subs.state).to.equal(Realm.App.Sync.SubscriptionsState.Superceded);
        });

        // TODO verify correct behaviour - right now this doesn't work
        xit("throws if you call update on a Superceded subscription set", async function (this: RealmContext) {
          const { subs } = addSubscriptionForPerson(this.realm);
          await subs.waitForSynchronization();
          const { subs: newSubs } = addSubscriptionForPerson(this.realm);
          await newSubs.waitForSynchronization();
          await subs.waitForSynchronization();

          // eslint-disable-next-line @typescript-eslint/no-empty-function
          expect(() => subs.update(() => {})).to.throw("???");
        });

        // TODO verify correct behaviour - right now this doesn't work
        xit("throws if you call waitForSynchronisation on a Superceded subscription set", async function (this: RealmContext) {
          const { subs } = addSubscriptionForPerson(this.realm);
          await subs.waitForSynchronization();
          const { subs: newSubs } = addSubscriptionForPerson(this.realm);
          await newSubs.waitForSynchronization();
          await subs.waitForSynchronization();

          await expect(subs.waitForSynchronization()).to.be.rejectedWith("???");
        });
      });

      describe("#error", function () {
        it("is null by default", function (this: RealmContext) {
          const subs = this.realm.getSubscriptions();
          expect(subs.error).to.be.null;
        });

        it("is null if there was no error synchronising subscriptions", async function (this: RealmContext) {
          const { subs } = addSubscriptionForPerson(this.realm);
          await subs.waitForSynchronization();

          expect(subs.error).to.be.null;
        });

        it("contains the error message if there was an error synchronising subscriptions", async function (this: RealmContext) {
          const { subs } = addSubscription(
            this.realm,
            this.realm.objects(PersonSchema.name).filtered("nonQueryable == 'test'"),
          );
          await expect(subs.waitForSynchronization()).to.be.rejected;

          expect(subs.error).to.equal(
            'Client provided query with bad syntax: invalid match expression for table "Person": key "nonQueryable" is not a queryable field',
          );
        });

        it("is null if there was an error but it was subsequently corrected", async function (this: RealmContext) {
          const { subs } = addSubscription(
            this.realm,
            this.realm.objects(PersonSchema.name).filtered("nonQueryable == 'test'"),
          );
          await expect(subs.waitForSynchronization()).to.be.rejected;

          expect(subs.error).to.equal(
            'Client provided query with bad syntax: invalid match expression for table "Person": key "nonQueryable" is not a queryable field',
          );

          subs.update((mutableSubs) => {
            mutableSubs.removeAll();
            mutableSubs.add(this.realm.objects(PersonSchema.name));
          });
          await expect(subs.waitForSynchronization()).to.be.fulfilled;

          expect(subs.error).to.be.null;
        });

        it("still contains the erroring subscription in the set if there was an error synchronising", async function (this: RealmContext) {
          const { subs } = addSubscription(
            this.realm,
            this.realm.objects(PersonSchema.name).filtered("nonQueryable == 'test'"),
          );
          await expect(subs.waitForSynchronization()).to.be.rejected;

          expect(subs).to.have.length(1);
        });
      });

      describe("#waitForSynchronization", async function () {
        it("returns a promise", function (this: RealmContext) {
          const { subs } = addSubscriptionForPerson(this.realm);

          const promise = subs.waitForSynchronization();
          expect(promise).to.be.instanceOf(Promise);
          return promise;
        });

        it("throws an error if no subscriptions have been created", async function (this: RealmContext) {
          expect(this.realm.getSubscriptions().waitForSynchronization()).to.be.rejectedWith(
            "`waitForSynchronisation` cannot be called before creating a subscription set using `update`",
          );
        });

        it("waits for subscriptions to be in a complete state", async function (this: RealmContext) {
          const { subs } = addSubscriptionForPerson(this.realm);
          expect(subs.state).to.equal(Realm.App.Sync.SubscriptionsState.Pending);

          await subs.waitForSynchronization();

          expect(subs.state).to.equal(Realm.App.Sync.SubscriptionsState.Complete);
        });

        it("resolves if subscriptions are already in a complete state", async function (this: RealmContext) {
          const { subs } = addSubscriptionForPerson(this.realm);
          await subs.waitForSynchronization();
          await subs.waitForSynchronization();

          expect(subs.state).to.equal(Realm.App.Sync.SubscriptionsState.Complete);
        });

        it("throws if there is an error synchronising subscriptions", async function (this: RealmContext) {
          const { subs } = addSubscription(
            this.realm,
            this.realm.objects(PersonSchema.name).filtered("nonQueryable == 'test'"),
          );
          expect(subs.state).to.equal(Realm.App.Sync.SubscriptionsState.Pending);

          await expect(subs.waitForSynchronization()).to.be.rejectedWith(
            'Client provided query with bad syntax: invalid match expression for table "Person": key "nonQueryable" is not a queryable field',
          );

          expect(subs.state).to.equal(Realm.App.Sync.SubscriptionsState.Error);
        });

        it("throws if subscriptions are already in an error state", async function (this: RealmContext) {
          const { subs } = addSubscription(
            this.realm,
            this.realm.objects(PersonSchema.name).filtered("nonQueryable == 'test'"),
          );

          try {
            await subs.waitForSynchronization();
          } catch (e) {
            // Do nothing
          }

          await expect(subs.waitForSynchronization()).to.be.rejectedWith(
            'Client provided query with bad syntax: invalid match expression for table "Person": key "nonQueryable" is not a queryable field',
          );

          expect(subs.state).to.equal(Realm.App.Sync.SubscriptionsState.Error);
        });

        it("cannot be called on a MutableSubscriptions instance", async function (this: RealmContext) {
          const subs = this.realm.getSubscriptions();

          subs.update((mutableSubs) => {
            expect(() => ((mutableSubs as unknown) as Realm.App.Sync.Subscriptions).waitForSynchronization()).to.throw(
              "mutableSubs.waitForSynchronization is not a function",
            );
          });
        });
      });

      describe("#update", function () {
        // These tests originated when SubscriptionSet and MutableSubscriptionSet were the same
        // class in core, so we had to keep track of mutability, but perhaps still have value
        describe("calling mutating methods outside an update callback", function () {
          it("Subscriptions.add does not exist on non-mutable Subscriptions instances", function (this: RealmContext) {
            const subs = this.realm.getSubscriptions();

            expect(() => {
              ((subs as unknown) as Realm.App.Sync.MutableSubscriptions).add(this.realm.objects(PersonSchema.name));
            }).throws("subs.add is not a function");
          });

          it("Subscriptions.remove does not exist on non-mutable Subscriptions instances", function (this: RealmContext) {
            const { subs, query } = addSubscriptionForPerson(this.realm);

            expect(() => {
              ((subs as unknown) as Realm.App.Sync.MutableSubscriptions).remove(query);
            }).throws("subs.remove is not a function");
          });

          it("Subscriptions.removeByName does not exist on non-mutable Subscriptions instances", function (this: RealmContext) {
            const { subs } = addSubscriptionForPerson(this.realm);

            expect(() => {
              ((subs as unknown) as Realm.App.Sync.MutableSubscriptions).removeByName("test");
            }).throws("subs.removeByName is not a function");
          });

          it("Subscriptions.removeSubscription does not exist on non-mutable Subscriptions instances", function (this: RealmContext) {
            const { subs, sub } = addSubscriptionForPerson(this.realm);

            expect(() => {
              ((subs as unknown) as Realm.App.Sync.MutableSubscriptions).removeSubscription(sub);
            }).throws("subs.removeSubscription is not a function");
          });

          it("Subscriptions.removeAll does not exist on non-mutable Subscriptions instances", function (this: RealmContext) {
            const { subs } = addSubscriptionForPerson(this.realm);

            expect(() => {
              ((subs as unknown) as Realm.App.Sync.MutableSubscriptions).removeAll();
            }).throws("subs.removeAll is not a function");
          });

          it("Subscriptions.removeByObjectType does not exist on non-mutable Subscriptions instances", function (this: RealmContext) {
            const { subs } = addSubscriptionForPerson(this.realm);

            expect(() => {
              ((subs as unknown) as Realm.App.Sync.MutableSubscriptions).removeByObjectType("test");
            }).throws("subs.removeByObjectType is not a function");
          });

          it("throws an error if a mutating method is called outside of an update() callback by holding a reference to the MutableSubscriptions", function (this: RealmContext) {
            // https://github.com/realm/realm-core/pull/5162
            const subs = this.realm.getSubscriptions();
            let mutableSubs: Realm.App.Sync.MutableSubscriptions;

            subs.update((m) => {
              mutableSubs = m;
            });

            expect(() => {
              mutableSubs.add(this.realm.objects(PersonSchema.name));
            }).throws(/Wrong transactional state.*/);
          });

          it("throws if called on a MutableSubscriptions instance", function (this: RealmContext) {
            const subs = this.realm.getSubscriptions();

            expect(() => {
              subs.update((mutableSubs) => {
                ((mutableSubs as unknown) as Realm.App.Sync.Subscriptions).update(() => {
                  // This should throw
                });
              });
            }).to.throw("mutableSubs.update is not a function");
          });
        });

        it("does not throw an error if a mutating method is called inside a update() callback", function (this: RealmContext) {
          const subs = this.realm.getSubscriptions();

          expect(() => {
            subs.update((mutableSubs) => {
              mutableSubs.add(this.realm.objects(PersonSchema.name));
            });
          }).to.not.throw();
        });

        it("mutates the Subscriptions instance", function (this: RealmContext) {
          const subs = this.realm.getSubscriptions();
          subs.update((mutableSubs) => {
            mutableSubs.add(this.realm.objects(PersonSchema.name));
          });

          expect(subs).to.have.length(1);
        });

        it("does not mutate another Subscriptions instance", function (this: RealmContext) {
          const subs = this.realm.getSubscriptions();
          const subs2 = this.realm.getSubscriptions();
          subs.update((mutableSubs) => {
            mutableSubs.add(this.realm.objects(PersonSchema.name));
          });

          expect(subs2).to.have.length(0);
        });

        it("does not wait for subscriptions to be in a Complete state", function (this: RealmContext) {
          const subs = this.realm.getSubscriptions();
          subs.update((mutableSubs) => {
            mutableSubs.add(this.realm.objects(PersonSchema.name));
          });

          expect(subs.state).to.equal(Realm.App.Sync.SubscriptionsState.Pending);
        });

        it("handles multiple updates in a single batch", function (this: RealmContext) {
          const { subs, query } = addSubscriptionForPerson(this.realm);

          subs.update((mutableSubs) => {
            mutableSubs.remove(query);
            mutableSubs.add(this.realm.objects(PersonSchema.name).filtered("age < 10"));
            mutableSubs.add(this.realm.objects(PersonSchema.name).filtered("age > 20"));
            mutableSubs.add(this.realm.objects(DogSchema.name).filtered("age > 30"));
          });

          expect(subs).to.have.length(3);

          expect(subs[0].queryString).to.equal("age < 10");
          expect(subs[0].objectType).to.equal(PersonSchema.name);

          expect(subs[1].queryString).to.equal("age > 20");
          expect(subs[1].objectType).to.equal(PersonSchema.name);

          expect(subs[2].queryString).to.equal("age > 30");
          expect(subs[2].objectType).to.equal(DogSchema.name);
        });

        it("handles multiple updates in multiple batches", function (this: RealmContext) {
          const { subs, query } = addSubscriptionForPerson(this.realm);

          subs.update((mutableSubs) => {
            mutableSubs.remove(query);
            mutableSubs.add(this.realm.objects(PersonSchema.name).filtered("age < 10"));
          });

          subs.update((mutableSubs) => {
            mutableSubs.add(this.realm.objects(PersonSchema.name).filtered("age > 20"));
            mutableSubs.add(this.realm.objects(DogSchema.name).filtered("age > 30"));
          });

          expect(subs).to.have.length(3);

          expect(subs[0].queryString).to.equal("age < 10");
          expect(subs[0].objectType).to.equal(PersonSchema.name);

          expect(subs[1].queryString).to.equal("age > 20");
          expect(subs[1].objectType).to.equal(PersonSchema.name);

          expect(subs[2].queryString).to.equal("age > 30");
          expect(subs[2].objectType).to.equal(DogSchema.name);
        });

        it("still applies all updates in a batch if one errors", async function (this: RealmContext) {
          const { subs } = addSubscriptionForPerson(this.realm);

          try {
            subs.update((mutableSubs) => {
              mutableSubs.add(this.realm.objects(PersonSchema.name).filtered("age < 10"));
              mutableSubs.add(this.realm.objects(PersonSchema.name).filtered("nonQueryable == 'test'"));
              mutableSubs.add(this.realm.objects(DogSchema.name).filtered("age > 30"));
            });
          } catch (e) {
            // Error is expected as `nonQueryable` field is not queryable
          }

          await expect(subs.waitForSynchronization()).to.be.rejected;
          expect(subs.state).to.equal(Realm.App.Sync.SubscriptionsState.Error);

          expect(subs).to.have.length(4);
        });

        it("allows an empty update", async function () {
          const { subs } = addSubscriptionForPerson(this.realm);

          // eslint-disable-next-line @typescript-eslint/no-empty-function
          subs.update(() => {});

          expect(subs).to.have.length(1);
        });
      });

      describe("#add", function () {
        it("returns a Subscription object", function (this: RealmContext) {
          const { sub } = addSubscriptionForPerson(this.realm);
          expect(sub).is.instanceOf(Realm.App.Sync.Subscription);
        });

        it("does not add a second identical subscription with no name", function (this: RealmContext) {
          addSubscriptionForPerson(this.realm);
          const { subs } = addSubscriptionForPerson(this.realm);

          expect(subs).to.have.lengthOf(1);
        });

        it("does add a second identical subscription with a different name", function (this: RealmContext) {
          addSubscriptionForPerson(this.realm, { name: "test1" });
          const { subs } = addSubscriptionForPerson(this.realm, { name: "test2" });

          expect(subs).to.have.lengthOf(2);
          expect(subs[0].name).to.equal("test1");
          expect(subs[1].name).to.equal("test2");
        });

        it("does not add a second identical subscription with the same name", function (this: RealmContext) {
          addSubscriptionForPerson(this.realm, { name: "test" });
          const { subs } = addSubscriptionForPerson(this.realm, { name: "test" });

          expect(subs).to.have.lengthOf(1);
        });

        it("adds a second subscription with the same object type and a different filter", function (this: RealmContext) {
          addSubscription(this.realm, this.realm.objects(PersonSchema.name));
          const { subs } = addSubscription(this.realm, this.realm.objects(PersonSchema.name).filtered("age > 10"));

          expect(subs).to.have.lengthOf(2);
        });

        it("does not a second subscription with the same query and a different sort", function (this: RealmContext) {
          addSubscription(this.realm, this.realm.objects(PersonSchema.name));
          const { subs } = addSubscription(this.realm, this.realm.objects(PersonSchema.name).sorted("name"));

          expect(subs).to.have.lengthOf(2);
        });

        it("updates an existing subscription with the same name and different query", function (this: RealmContext) {
          addSubscription(this.realm, this.realm.objects(PersonSchema.name));
          const { subs } = addSubscription(this.realm, this.realm.objects(PersonSchema.name).filtered("age > 10"));

          expect(subs).to.have.lengthOf(1);
          expect(subs[0].queryString).to.equal("age > 10");
        });

        it("allows an anonymous and a named subscription for the same query to exist", function (this: RealmContext) {
          const { sub } = addSubscription(this.realm, this.realm.objects(PersonSchema.name).filtered("age > 10"), {
            name: "test",
          });
          const { subs } = addSubscription(this.realm, this.realm.objects(PersonSchema.name).filtered("age > 10"));

          expect(subs).to.have.lengthOf(2);
          expect(subs[1].id).to.not.equal(sub.id);
        });

        it("if a subscription with the same query is added, properties of both the old and new reference can be accessed", function (this: RealmContext) {
          const { sub } = addSubscriptionForPerson(this.realm);
          const { sub: newSub } = addSubscriptionForPerson(this.realm);

          expect(sub.queryString).to.equal("TRUEPREDICATE");
          expect(newSub.queryString).to.equal("TRUEPREDICATE");
        });

        describe("#throwOnUpdate", function () {
          it("does not throw and does not add a new subscription if a subscription with the same name and same query is added, and throwOnUpdate is true", function (this: RealmContext) {
            const query = this.realm.objects(DogSchema.name);
            const { subs } = addSubscription(this.realm, query, { name: "test" });

            expect(() => {
              subs.update((mutableSubs) => {
                mutableSubs.add(query, { name: "test", throwOnUpdate: true });
              });
            }).to.not.throw();

            expect(this.realm.getSubscriptions()).to.have.lengthOf(1);
          });

          it("throws and does not add the subscription if a subscription with the same name but different query is added, and throwOnUpdate is true", function (this: RealmContext) {
            const { subs } = addSubscriptionForPerson(this.realm, { name: "test" });
            const query = this.realm.objects(DogSchema.name);

            expect(() => {
              subs.update((mutableSubs) => {
                mutableSubs.add(query, { name: "test", throwOnUpdate: true });
              });
            }).to.throw(
              "A subscription with the name 'test' already exists but has a different query. If you meant to update it, remove `throwOnUpdate: true` from the subscription options.",
            );

            expect(subs.find(query)).to.be.null;
          });

          function testThrowOnUpdateFalse(realm: Realm, addOptions: Realm.App.Sync.SubscriptionOptions = {}) {
            const { subs } = addSubscriptionForPerson(realm, { name: "test" });
            const query = realm.objects(DogSchema.name);

            expect(() => {
              subs.update((mutableSubs) => {
                mutableSubs.add(query, { name: "test", ...addOptions });
              });
            }).to.not.throw;
          }

          it("does not throw, and updates the existing subscription, if a subscription with the same name but different query is added, and throwOnUpdate is true", function (this: RealmContext) {
            testThrowOnUpdateFalse(this.realm, { throwOnUpdate: false });
          });

          it("does not throw, and updates the existing subscription, if a subscription with the same name but different query is added, and throwOnUpdate is not specified", function (this: RealmContext) {
            testThrowOnUpdateFalse(this.realm);
          });
        });
      });

      describe("#removeByName", function () {
        it("returns false and does not remove any subscriptions if the subscription is not found", function (this: RealmContext) {
          const { subs } = addSubscriptionForPerson(this.realm);

          subs.update((mutableSubs) => {
            expect(mutableSubs.removeByName("test")).to.be.false;
          });

          expect(subs.empty).to.be.false;
        });

        it("returns true and removes the subscription if the subscription is found", function (this: RealmContext) {
          addSubscription(this.realm, this.realm.objects(PersonSchema.name).filtered("age > 10"));
          const { subs } = addSubscriptionForPerson(this.realm, { name: "test" });

          expect(subs).to.have.length(2);

          subs.update((mutableSubs) => {
            expect(mutableSubs.removeByName("test")).to.be.true;
          });

          expect(subs).to.have.length(1);
          expect(subs[0].queryString).to.equal("age > 10");
        });
      });

      describe("#remove", function () {
        it("returns false and does not remove any subscriptions if the subscription for the query is not found", function (this: RealmContext) {
          const query = this.realm.objects(PersonSchema.name);
          const query2 = this.realm.objects(DogSchema.name);

          const { subs } = addSubscription(this.realm, query);

          subs.update((mutableSubs) => {
            expect(mutableSubs.remove(query2)).to.be.false;
          });

          expect(subs.empty).to.be.false;
        });

        it("returns true and removes the subscription for the query if it is found", function (this: RealmContext) {
          addSubscription(this.realm, this.realm.objects(PersonSchema.name).filtered("age > 10"));
          const { subs, query } = addSubscriptionForPerson(this.realm);

          expect(subs).to.have.length(2);

          subs.update((mutableSubs) => {
            expect(mutableSubs.remove(query)).to.be.true;
          });

          expect(subs).to.have.length(1);
          expect(subs[0].queryString).to.equal("age > 10");
        });

        it("removes multiple subscriptions", function (this: RealmContext) {
          addSubscription(this.realm, this.realm.objects(PersonSchema.name).filtered("age > 15"));
          addSubscription(this.realm, this.realm.objects(PersonSchema.name).filtered("name == 'John'"));
          addSubscription(this.realm, this.realm.objects(PersonSchema.name).filtered("name BEGINSWITH 'A'"));

          const subs = this.realm.getSubscriptions();

          expect(subs).to.have.length(3);

          subs.update((mutableSubs) => {
            mutableSubs.remove(this.realm.objects(PersonSchema.name).filtered("name == 'John'"));
            mutableSubs.remove(this.realm.objects(PersonSchema.name).filtered("name BEGINSWITH 'A'"));
          });

          expect(subs).to.have.length(1);
          expect(subs[0].queryString).to.equal("age > 15");
        });
      });

      describe("#removeSubscription", function () {
        it("returns false if the subscription is not found", function (this: RealmContext) {
          const { subs, sub } = addSubscriptionForPerson(this.realm);

          // Add a second sub to check we don't delete them all
          subs.update((mutableSubs) => {
            mutableSubs.add(this.realm.objects(DogSchema.name));
          });

          // Remove the first sub
          subs.update((mutableSubs) => {
            mutableSubs.removeSubscription(sub);
          });

          subs.update((mutableSubs) => {
            expect(mutableSubs.removeSubscription(sub)).to.be.false;
          });

          expect(subs.empty).to.be.false;
        });

        it("returns true and removes the subscription if the subscription is found", function (this: RealmContext) {
          addSubscription(this.realm, this.realm.objects(PersonSchema.name).filtered("age > 10"));
          const { subs, sub } = addSubscriptionForPerson(this.realm);

          expect(subs).to.have.length(2);

          subs.update((mutableSubs) => {
            expect(mutableSubs.removeSubscription(sub)).to.be.true;
          });

          expect(subs).to.have.length(1);
          expect(subs[0].queryString).to.equal("age > 10");
        });

        it("if a subscription with the same query is added, the old reference can be removed", function (this: RealmContext) {
          const { sub } = addSubscriptionForPerson(this.realm);
          const { subs } = addSubscriptionForPerson(this.realm);

          expect(subs).to.have.length(1);

          subs.update((mutableSubs) => {
            expect(mutableSubs.removeSubscription(sub)).to.be.true;
          });

          expect(subs).to.have.length(0);
        });

        it("if a subscription with the same query is added, the new reference can be removed", function (this: RealmContext) {
          addSubscriptionForPerson(this.realm);
          const { sub: newSub, subs } = addSubscriptionForPerson(this.realm);

          expect(subs).to.have.length(1);

          subs.update((mutableSubs) => {
            expect(mutableSubs.removeSubscription(newSub)).to.be.true;
          });

          expect(subs).to.have.length(0);
        });
      });

      describe("#removeAll", function () {
        it("returns 0 if no subscriptions exist", function (this: RealmContext) {
          const subs = this.realm.getSubscriptions();

          subs.update((mutableSubs) => {
            expect(mutableSubs.removeAll()).to.equal(0);
          });
        });

        it("removes all subscriptions and returns the number of subscriptions removed", async function (this: RealmContext) {
          addSubscriptionForPerson(this.realm);
          const { subs } = addSubscription(this.realm, this.realm.objects(PersonSchema.name).filtered("age > 10"));
          await subs.waitForSynchronization();

          subs.update((mutableSubs) => {
            expect(mutableSubs.removeAll()).to.equal(2);
          });

          expect(subs.empty).to.be.true;
        });
      });

      describe("#removeByObjectType", function () {
        it("returns 0 if no subscriptions for the object type exist", function (this: RealmContext) {
          const { subs } = addSubscriptionForPerson(this.realm);

          subs.update((mutableSubs) => {
            expect(mutableSubs.removeByObjectType(DogSchema.name)).to.equal(0);
          });

          expect(subs.empty).to.be.false;
        });

        it("removes all subscriptions for the object type and returns the number of subscriptions removed", function (this: RealmContext) {
          addSubscriptionForPerson(this.realm);
          addSubscription(this.realm, this.realm.objects(PersonSchema.name).filtered("age > 10"));
          const { subs } = addSubscription(this.realm, this.realm.objects(DogSchema.name));

          subs.update((mutableSubs) => {
            expect(mutableSubs.removeByObjectType(PersonSchema.name)).to.equal(2);
          });

          expect(subs).to.have.length(1);
          expect(subs[0].objectType).to.equal(DogSchema.name);
        });
      });

      describe("persistence", function () {
        it("persists subscriptions when the Realm is reopened", async function (this: RealmContext) {
          addSubscriptionForPerson(this.realm);
          await this.realm.getSubscriptions().waitForSynchronization();
          expect(this.realm.getSubscriptions()).to.have.length(1);

          const newRealm = closeAndReopenRealm(this.realm, this.config, false);

          expect(newRealm.getSubscriptions()).to.have.length(1);

          await newRealm.getSubscriptions().waitForSynchronization();
          expect(newRealm.getSubscriptions().state).to.equal("complete");
        });
      });
    });

    // TODO Right now there is no is_valid method we can use to verify if the subs
    // are in a valid state... maybe need a different solution as this will crash
    xdescribe("when realm is closed", function () {
      it("waitForSynchronization throws an error if the Realm has been closed", async function (this: RealmContext) {
        const { subs } = addSubscriptionForPerson(this.realm);
        this.realm.close();
        await subs.waitForSynchronization();
      });

      it("update throws an error if the Realm has been closed", async function (this: RealmContext) {
        const { subs } = addSubscriptionForPerson(this.realm);
        this.realm.close();
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        subs.update(() => {});
      });
    });
  });

  describe("end-to-end synchronisation", function () {
    /**
     * Add a Person object and wait for the subscription set to be synchronised
     *
     * @param realm Realm instance
     * @returns Promise, resolving to an object containing the object and its id
     */
    async function addPersonAndWaitForSync(realm: Realm): Promise<{ person: IPerson; id: BSON.ObjectId }> {
      const person = realm.write(function () {
        return realm.create<IPerson>(PersonSchema.name, { _id: new BSON.ObjectId(), name: "Tom", age: 36 });
      });

      await realm.getSubscriptions().waitForSynchronization();

      return { person, id: person._id };
    }

    /**
     * Add the specified subscription, wait for subscriptions to be synchronised and
     * add a Person object, then close and delete the Realm, re-open it and wait for
     * synchronisation again.
     *
     * This verifies that an object has/has not been synced, as the re-opened Realm will
     * only contain synced objects.
     *
     * @param realm Realm instance
     * @param config Realm configuration
     * @param subsUpdateFn Callback to add subscriptions. Receives a MutableSubscriptions instance
     * and the currenly open realm. This is called both at the start of the function, and after
     * the Realm has been re-opened.
     * @returns Promise, resolving to an object containing the inserted object's ID (so we
     * can search for it again to check if it exists or not) and the reopened Realm instance
     */
    async function addPersonAndResyncWithSubscription(
      realm: Realm,
      config: Realm.Configuration,
      subsUpdateFn: (mutableSubs: Realm.App.Sync.MutableSubscriptions, realm: Realm) => void,
    ): Promise<{ id: BSON.ObjectId; newRealm: Realm }> {
      realm.getSubscriptions().update((m) => subsUpdateFn(m, realm));
      await realm.getSubscriptions().waitForSynchronization();

      const { id } = await addPersonAndWaitForSync(realm);

      const newRealm = closeAndReopenRealm(realm, config);
      expect(newRealm.objectForPrimaryKey(PersonSchema.name, id)).to.be.undefined;

      newRealm.getSubscriptions().update((m) => subsUpdateFn(m, newRealm));
      await newRealm.getSubscriptions().waitForSynchronization();

      return { id, newRealm };
    }

    it("syncs added items to a subscribed collection", async function (this: RealmContext) {
      const { id, newRealm } = await addPersonAndResyncWithSubscription(this.realm, this.config, (m, realm) => {
        m.add(realm.objects(PersonSchema.name));
      });

      expect(newRealm.objectForPrimaryKey(PersonSchema.name, id)).to.not.be.undefined;
    });

    it("syncs added items to a subscribed collection with a filter", async function (this: RealmContext) {
      const { id, newRealm } = await addPersonAndResyncWithSubscription(this.realm, this.config, (m, realm) => {
        m.add(realm.objects(PersonSchema.name).filtered("age > 30"));
      });

      expect(newRealm.objectForPrimaryKey(PersonSchema.name, id)).to.not.be.undefined;
    });

    it("does not sync added items not matching the filter", async function (this: RealmContext) {
      const { id, newRealm } = await addPersonAndResyncWithSubscription(this.realm, this.config, (m, realm) => {
        m.add(realm.objects(PersonSchema.name).filtered("age < 30"));
      });

      expect(newRealm.objectForPrimaryKey(PersonSchema.name, id)).to.be.undefined;
    });

    it("starts syncing items if a new subscription is added matching some items", async function (this: RealmContext) {
      const { id, newRealm } = await addPersonAndResyncWithSubscription(this.realm, this.config, (m, realm) => {
        m.add(realm.objects(PersonSchema.name).filtered("age < 30"));
      });
      expect(newRealm.objectForPrimaryKey(PersonSchema.name, id)).to.be.undefined;

      const subs = newRealm.getSubscriptions();
      subs.update((mutableSubs) => {
        mutableSubs.add(newRealm.objects(PersonSchema.name).filtered("age > 30"));
      });
      await subs.waitForSynchronization();

      newRealm.addListener("change", () => {
        expect(newRealm.objectForPrimaryKey(PersonSchema.name, id)).to.not.be.undefined;
      });
    });

    it("starts syncing items if the subscription is replaced to match some items", async function (this: RealmContext) {
      const { id, newRealm } = await addPersonAndResyncWithSubscription(this.realm, this.config, (m, realm) => {
        m.add(realm.objects(PersonSchema.name).filtered("age < 30"));
      });
      expect(newRealm.objectForPrimaryKey(PersonSchema.name, id)).to.be.undefined;

      const subs = newRealm.getSubscriptions();
      subs.update((mutableSubs) => {
        mutableSubs.removeAll();
        mutableSubs.add(newRealm.objects(PersonSchema.name).filtered("age > 30"));
      });
      await subs.waitForSynchronization();

      newRealm.addListener("change", () => {
        expect(newRealm.objectForPrimaryKey(PersonSchema.name, id)).to.not.be.undefined;
      });
    });

    it("stops syncing items when a subscription is removed (but other subscriptions still exist)", async function (this: RealmContext) {
      const { id, newRealm } = await addPersonAndResyncWithSubscription(this.realm, this.config, (m, realm) => {
        m.add(realm.objects(PersonSchema.name).filtered("age < 40"), { name: "test" });
        m.add(realm.objects(PersonSchema.name).filtered("age > 50"));
      });
      expect(newRealm.objectForPrimaryKey(PersonSchema.name, id)).to.not.be.undefined;

      const subs = newRealm.getSubscriptions();
      subs.update((mutableSubs) => {
        mutableSubs.removeByName("test");
      });
      await subs.waitForSynchronization();

      newRealm.addListener("change", () => {
        expect(newRealm.objectForPrimaryKey(PersonSchema.name, id)).to.be.undefined;
      });
    });

    it("stops syncing items when all subscriptions are removed", async function (this: RealmContext) {
      const { id, newRealm } = await addPersonAndResyncWithSubscription(this.realm, this.config, (m, realm) => {
        m.add(realm.objects(PersonSchema.name));
      });
      expect(newRealm.objectForPrimaryKey(PersonSchema.name, id)).to.not.be.undefined;

      const subs = newRealm.getSubscriptions();
      subs.update((mutableSubs) => {
        mutableSubs.removeAll();
      });
      await subs.waitForSynchronization();

      newRealm.addListener("change", () => {
        expect(newRealm.objectForPrimaryKey(PersonSchema.name, id)).to.be.undefined;
      });
    });

    it("stops syncing items if the filter changes to not match some items", async function (this: RealmContext) {
      const { id, newRealm } = await addPersonAndResyncWithSubscription(this.realm, this.config, (m, realm) => {
        m.add(realm.objects(PersonSchema.name).filtered("age > 30"));
      });
      expect(newRealm.objectForPrimaryKey(PersonSchema.name, id)).to.not.be.undefined;

      const subs = newRealm.getSubscriptions();
      subs.update((mutableSubs) => {
        mutableSubs.removeAll();
        mutableSubs.add(newRealm.objects(PersonSchema.name).filtered("age < 30"));
      });
      await subs.waitForSynchronization();

      expect(newRealm.objectForPrimaryKey(PersonSchema.name, id)).to.be.undefined;
    });

    // TODO test more complex integration scenarios, e.g. links, embedded objects, collections, complex queries

    describe("client reset scenarios", function () {
      it("triggers a client reset if items are added without a subscription", async function (this: RealmContext) {
        await expectClientResetError(this.config, this.user, (realm) => {
          realm.write(() => {
            return realm.create<IPerson>(PersonSchema.name, { _id: new BSON.ObjectId(), name: "Tom", age: 36 });
          });
        });
      });

      it("triggers a client reset and deletes the item if an item not matching the filter is created", async function (this: RealmContext) {
        const { subs } = addSubscription(this.realm, this.realm.objects(PersonSchema.name).filtered("age < 30"));
        await subs.waitForSynchronization();

        await expectClientResetError(
          this.config,
          this.user,
          (realm) => {
            realm.write(() => {
              realm.create<IPerson>(PersonSchema.name, { _id: new BSON.ObjectId(), name: "Tom Old", age: 99 });
            });
          },
          () => {
            expect(this.realm.objects(PersonSchema.name)).to.have.length(0);
          },
        );
      });

      it("triggers a client reset if you remove a subscription without waiting for server acknowledgement, then modify objects that were only matched by the now removed subscription", async function (this: RealmContext) {
        await expectClientResetError(this.config, this.user, async (realm) => {
          const { sub, subs } = addSubscriptionForPerson(this.realm);
          await subs.waitForSynchronization();

          this.realm.getSubscriptions().update((mutableSubs) => {
            mutableSubs.removeSubscription(sub);
          });

          // Deliberately not waiting for synchronisation here

          realm.write(function () {
            return realm.create<IPerson>(PersonSchema.name, { _id: new BSON.ObjectId(), name: "Tom", age: 36 });
          });
        });
      });

      it("does not trigger a client reset if you make a change that moves an object outside your view", async function (this: RealmContext) {
        const realm = this.realm;

        const action = async () => {
          const { subs } = addSubscription(realm, realm.objects(PersonSchema.name).filtered("age < 40"));
          await subs.waitForSynchronization();

          const person = realm.write(() => {
            return realm.create<IPerson>(PersonSchema.name, { _id: new BSON.ObjectId(), name: "Tom", age: 36 });
          });

          realm.write(() => {
            person.age = 46;
          });
        };

        await expect(action()).to.not.be.rejected;
      });
    });
  });
});
