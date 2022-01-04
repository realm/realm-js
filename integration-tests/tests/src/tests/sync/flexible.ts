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

import { expect } from "chai";
import Realm, { BSON } from "realm";

import {
  authenticateUserBefore,
  closeAndReopenRealm,
  importAppBefore,
  openRealm,
  openRealmBeforeEach,
} from "../../hooks";
import { DogSchema, IPerson, Person, PersonSchema } from "../../schemas/person-and-dog-with-object-ids";

// TODO do we need to handle getSyncSession?
// TODO check we can update query

const realmConfig = { schema: [PersonSchema, DogSchema], sync: { flexible: true } };

describe("Flexible sync", function () {
  function addPersonSubscription(realm: Realm, options: Realm.App.Sync.SubscriptionOptions = undefined) {
    return addSubscription(realm, realm.objects(PersonSchema.name), options);
  }

  function addSubscription(
    realm: Realm,
    query: Realm.Results<any>,
    options: Realm.App.Sync.SubscriptionOptions = undefined,
  ) {
    const subs = realm.getSubscriptions();
    let sub: Realm.App.Sync.Subscription;

    subs.update((mutableSubs) => {
      sub = mutableSubs.add(query, options);
    });

    return { subs, sub, query };
  }

  importAppBefore("with-db-flx", {});
  // importAppBefore("with-db-flx", {}, "all");
  authenticateUserBefore();
  openRealmBeforeEach(realmConfig);

  describe("setup", function () {
    describe("config", function () {
      it("accepts a { flexible: true } option", function () {
        expect(() => {
          new Realm({ sync: { flexible: true, user: this.user } });
        }).to.not.throw();
      });

      it("does not accept { flexible: true } and a partition value", function () {
        expect(() => {
          new (Realm as any)({ sync: { flexible: true, user: this.user, partitionValue: "test" } });
        }).to.throw("'partitionValue' cannot be specified when flexible sync is enabled");
      });

      it("accepts { flexible: false } and a partition value", function () {
        expect(() => {
          new Realm({ sync: { flexible: false, user: this.user, partitionValue: "test" } });
        }).to.not.throw();
      });

      it("accepts { flexible: undefined } and a partition value", function () {
        expect(() => {
          new Realm({ sync: { flexible: undefined, user: this.user, partitionValue: "test" } });
        }).to.not.throw();
      });
    });

    describe("Realm.getSubscriptions()", function () {
      it("returns a Subscriptions instance", function (this: RealmContext) {
        expect(this.realm.getSubscriptions()).to.be.instanceOf(Realm.App.Sync.Subscriptions);
      });

      // Waiting on core to have ability to check if sync config is flexible
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

      // TODO are these tests a bit redundant?
      it("returns the correct queries when multiple queries are added in a single update call", function (this: RealmContext) {
        let sub1: Realm.App.Sync.Subscription;
        let sub2: Realm.App.Sync.Subscription;
        let sub3: Realm.App.Sync.Subscription;
        const subs = this.realm.getSubscriptions();
        const realm = this.realm;

        subs.update((mutableSubs: any) => {
          sub1 = mutableSubs.add(realm.objects(PersonSchema.name).filtered("age > 15"));
          sub2 = mutableSubs.add(realm.objects(PersonSchema.name).filtered("age > 20"));
          sub3 = mutableSubs.add(realm.objects(PersonSchema.name).filtered("age > 25"));
        });

        expect(sub1.queryString).to.equal("age > 15");
        expect(sub2.queryString).to.equal("age > 20");
        expect(sub3.queryString).to.equal("age > 25");
      });

      it("returns the correct queries when multiple queries are added in multiple update calls", function (this: RealmContext) {
        const sub1 = addSubscription(this.realm, this.realm.objects(PersonSchema.name).filtered("age > 30")).sub;
        expect(sub1.queryString).to.equal("age > 30");

        const sub2 = addSubscription(this.realm, this.realm.objects(PersonSchema.name).filtered("age > 35")).sub;
        expect(sub2.queryString).to.equal("age > 35");

        const sub3 = addSubscription(this.realm, this.realm.objects(PersonSchema.name).filtered("age > 40")).sub;
        expect(sub3.queryString).to.equal("age > 40");
      });
    });

    describe("Subscription", function () {
      it("has a createdAt date", function (this: RealmContext) {
        const sub = addPersonSubscription(this.realm).sub;
        expect(sub.createdAt).to.be.instanceOf(Date);
      });

      it("has an updatedAt date", function (this: RealmContext) {
        const sub = addPersonSubscription(this.realm).sub;
        expect(sub.updatedAt).to.be.instanceOf(Date);
      });

      it("has a default name", function (this: RealmContext) {
        const sub = addPersonSubscription(this.realm).sub;
        expect(sub.name).to.equal(null);
      });

      it("has a specified name", function (this: RealmContext) {
        const subWithName = addPersonSubscription(this.realm, { name: "test" }).sub;
        expect(subWithName.name).to.equal("test");
      });

      it("has an objectType", function (this: RealmContext) {
        const sub = addPersonSubscription(this.realm).sub;
        expect(sub.objectType).to.equal(PersonSchema.name);
      });

      it("has a default query", function (this: RealmContext) {
        const sub = addPersonSubscription(this.realm).sub;
        expect(sub.queryString).to.equal("TRUEPREDICATE");
      });

      it("has a specified query", function (this: RealmContext) {
        const subWithFilter = addSubscription(
          this.realm,
          this.realm.objects(PersonSchema.name).filtered("age > 10"),
        ).sub;
        expect(subWithFilter.queryString).to.equal("age > 10");
      });
    });

    describe("Subscriptions", function () {
      describe("#version", function () {
        it("starts at 0", function () {
          expect(this.realm.getSubscriptions().version).to.equal(0);
        });

        it("is incremented when an update is performed", function (this: RealmContext) {
          expect(this.realm.getSubscriptions().version).to.equal(0);
          const { subs } = addPersonSubscription(this.realm);
          expect(subs.version).to.equal(1);
        });

        it("is only incremented on the instance of Subscriptions which is updated", function (this: RealmContext) {
          // This instance will not be updated as we did not mutate it
          const originalSubs = this.realm.getSubscriptions();
          expect(originalSubs.version).to.equal(0);
          addPersonSubscription(this.realm);
          expect(originalSubs.version).to.equal(0);
        });
      });

      describe("#empty", function () {
        it("returns true if no subscriptions exist", function (this: RealmContext) {
          expect(this.realm.getSubscriptions().empty).to.be.true;
        });

        it("returns false if subscriptions exist", function (this: RealmContext) {
          const { subs } = addPersonSubscription(this.realm);

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

      describe("#snapshot", function () {
        it("returns an array", function (this: RealmContext) {
          const subs = this.realm.getSubscriptions();
          expect(subs.snapshot()).to.be.instanceOf(Array);
        });

        it("returns an empty array if there are no subscriptions", function (this: RealmContext) {
          const subs = this.realm.getSubscriptions();
          expect(subs.snapshot()).to.have.length(0);
        });

        it("returns an array of Subscription objects", async function (this: RealmContext) {
          addPersonSubscription(this.realm);
          const { subs } = addSubscription(this.realm, this.realm.objects(PersonSchema.name).filtered("age > 10"));

          expect(subs.snapshot()).to.have.length(2);
          expect(subs.snapshot().every((s) => s instanceof Realm.App.Sync.Subscription)).to.be.true;
        });

        it("is an immutable snapshot of the subscriptions when snapshot was called", function (this: RealmContext) {
          const { subs } = addPersonSubscription(this.realm);
          const snapshot = subs.snapshot();
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
          const { subs, sub } = addPersonSubscription(this.realm, { name: "test" });

          expect(subs.findByName("test")).to.deep.equal(sub);
        });
      });

      describe("#find", function () {
        it("returns null if the query is not subscribed to", function (this: RealmContext) {
          expect(this.realm.getSubscriptions().find(this.realm.objects(PersonSchema.name))).to.be.null;
        });

        it("returns a query's subscription by reference", function (this: RealmContext) {
          const { subs, sub, query } = addPersonSubscription(this.realm);

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
          const { subs, sub } = addPersonSubscription(this.realm);

          expect(subs.find(this.realm.objects(PersonSchema.name))).to.deep.equal(sub);
        });
      });

      describe("#state", function () {
        it("is Pending by default", function (this: RealmContext) {
          const subs = this.realm.getSubscriptions();
          expect(subs.state).to.equal(Realm.App.Sync.SubscriptionsState.Pending);
        });

        it("is Complete once synchronisation is complete", async function (this: RealmContext) {
          const { subs } = addPersonSubscription(this.realm);
          await subs.waitForSynchronization();

          expect(subs.state).to.equal(Realm.App.Sync.SubscriptionsState.Complete);
        });

        xit("is Error if there is an error during synchronisation", async function (this: RealmContext) {
          const subs = this.realm.getSubscriptions();
          // TODO simulate error
          await subs.waitForSynchronization();

          expect(subs.state).to.equal(Realm.App.Sync.SubscriptionsState.Error);
        });

        xit("is Superceeded after an update is synchronised", async function (this: RealmContext) {
          const subs = this.realm.getSubscriptions();

          const { subs: newSubs } = addPersonSubscription(this.realm);
          await newSubs.waitForSynchronization();

          expect(subs.state).to.equal(Realm.App.Sync.SubscriptionsState.Superceded);
        });

        // TODO can you call waitForSync on a superceeded set?
      });

      describe("#error", function () {
        it("is null by default", function (this: RealmContext) {
          const subs = this.realm.getSubscriptions();
          expect(subs.error).to.be.null;
        });

        // TODO waiting on core - currently calling waitForSynchronization crashes when test times out
        it("is null if there was no error synchronising subscriptions", async function (this: RealmContext) {
          const { subs } = addPersonSubscription(this.realm);
          await subs.waitForSynchronization();

          expect(subs.error).to.be.null;
        });

        it("contains the error if there was an error synchronising subscriptions", async function (this: RealmContext) {
          const { subs } = addPersonSubscription(this.realm);
          // TODO simulate error
          await subs.waitForSynchronization();

          expect(subs.error).to.be.instanceOf(Error);
          // TODO check more stuff about the error
        });
      });

      // TODO waiting on core - currently calling waitForSynchronization crashes when test times out
      describe("#waitForSynchronization", async function () {
        xit("returns a promise", async function (this: RealmContext) {
          const { subs } = addPersonSubscription(this.realm);

          // BOOM
          subs.waitForSynchronization();
          // expect(subs.waitForSynchronization()).to.be.instanceOf(Promise);
        });

        it("waits for subscriptions to be in a complete state", async function (this: RealmContext) {
          const { subs } = addPersonSubscription(this.realm);
          expect(subs.state).to.equal(Realm.App.Sync.SubscriptionsState.Pending);

          await subs.waitForSynchronization();

          expect(subs.state).to.equal(Realm.App.Sync.SubscriptionsState.Complete);
        });

        it("resolves if subscriptions are already in a complete state", async function (this: RealmContext) {
          const { subs } = addPersonSubscription(this.realm);
          await subs.waitForSynchronization();
          await subs.waitForSynchronization();

          expect(subs.state).to.equal(Realm.App.Sync.SubscriptionsState.Complete);
        });

        it("throws if there is an error synchronising subscriptions", async function (this: RealmContext) {
          const { subs } = addPersonSubscription(this.realm);
          expect(subs.state).to.equal(Realm.App.Sync.SubscriptionsState.Pending);

          // TODO simulate error
          await subs.waitForSynchronization();

          expect(subs.state).to.equal(Realm.App.Sync.SubscriptionsState.Error);
        });

        xit("throws if another client updates subscriptions while waiting for synchronisation", function (this: RealmContext) {
          // TODO what is the proper way to do this?
          const otherClientRealm = new Realm({ schema: [PersonSchema], sync: { flexible: true, user: this.user } });

          const { subs } = addPersonSubscription(this.realm);

          const otherClientSubs = otherClientRealm.getSubscriptions();

          expect(
            Promise.all([
              otherClientSubs.update((mutableSubs) => {
                mutableSubs.add(this.realm.objects(PersonSchema.name));
              }),
              subs.waitForSynchronization(),
            ]),
          ).throws("xxx");
          expect(subs.state).to.equal(Realm.App.Sync.SubscriptionsState.Error);
        });

        xit("throws if called on a MutableSubscriptions instance", async function (this: RealmContext) {
          const subs = this.realm.getSubscriptions();

          subs.update(async (mutableSubs) => {
            // This should throw
            expect(async () => {
              await (mutableSubs as unknown as Realm.App.Sync.Subscriptions).waitForSynchronization();
            }).to.throw("`waitForSynchronization` cannot be called on a mutable subscription set.");
          });
        });
      });

      describe("#update", function () {
        describe("calling mutating methods outside an update callback", function () {
          it("throws an error if Subscriptions.add is called outside of an update() callback", function (this: RealmContext) {
            const subs = this.realm.getSubscriptions();

            expect(() => {
              (subs as unknown as Realm.App.Sync.MutableSubscriptions).add(this.realm.objects(PersonSchema.name));
            }).throws("Subscriptions can only be added inside an `update` callback.");
          });

          it("throws an error if Subscriptions.remove is called outside of an update() callback", function (this: RealmContext) {
            const { subs, query } = addPersonSubscription(this.realm);

            expect(() => {
              (subs as unknown as Realm.App.Sync.MutableSubscriptions).remove(query);
            }).throws("Subscriptions can only be removed inside an `update` callback.");
          });

          it("throws an error if Subscriptions.removeByName is called outside of an update() callback", function (this: RealmContext) {
            const { subs } = addPersonSubscription(this.realm);

            expect(() => {
              (subs as unknown as Realm.App.Sync.MutableSubscriptions).removeByName("test");
            }).throws("Subscriptions can only be removed inside an `update` callback.");
          });

          it("throws an error if Subscriptions.removeSubscription is called outside of an update() callback", function (this: RealmContext) {
            const { subs, sub } = addPersonSubscription(this.realm);

            expect(() => {
              (subs as unknown as Realm.App.Sync.MutableSubscriptions).removeSubscription(sub);
            }).throws("Subscriptions can only be removed inside an `update` callback.");
          });

          it("throws an error if Subscriptions.removeAll is called outside of an update() callback", function (this: RealmContext) {
            const { subs } = addPersonSubscription(this.realm);

            expect(() => {
              (subs as unknown as Realm.App.Sync.MutableSubscriptions).removeAll();
            }).throws("Subscriptions can only be removed inside an `update` callback.");
          });

          it("throws an error if Subscriptions.removeByObjectType is called outside of an update() callback", function (this: RealmContext) {
            const { subs } = addPersonSubscription(this.realm);

            expect(() => {
              (subs as unknown as Realm.App.Sync.MutableSubscriptions).removeByObjectType("test");
            }).throws("Subscriptions can only be removed inside an `update` callback.");
          });

          it("throws an error if a mutating method is called outside of an update() callback by holding a reference to the MutableSubscriptions", function (this: RealmContext) {
            const subs = this.realm.getSubscriptions();
            let mutableSubs: Realm.App.Sync.MutableSubscriptions;

            subs.update((m) => {
              mutableSubs = m;
            });

            expect(() => {
              mutableSubs.add(this.realm.objects(PersonSchema.name));
            }).throws("Subscriptions can only be added inside an `update` callback.");
          });

          it("throws if called on a MutableSubscriptions instance", function (this: RealmContext) {
            const subs = this.realm.getSubscriptions();

            expect(() => {
              subs.update((mutableSubs) => {
                (mutableSubs as unknown as Realm.App.Sync.Subscriptions).update(() => {
                  // This should throw
                });
              });
            }).to.throw("`update` cannot be called on a mutable subscription set.");
          });
        });

        it("does not throw an error if Subscriptions.add is called inside a update() callback", function (this: RealmContext) {
          const subs = this.realm.getSubscriptions();

          expect(() => {
            subs.update((mutableSubs) => {
              mutableSubs.add(this.realm.objects(PersonSchema.name));
            });
          }).to.not.throw();
        });

        it("does not throw an error if Subscriptions.remove is called inside a update() callback", function (this: RealmContext) {
          const { sub, subs } = addPersonSubscription(this.realm);

          expect(() => {
            subs.update((mutableSubs) => {
              mutableSubs.removeSubscription(sub);
            });
          }).to.not.throw();
        });

        it("mutates the Subscriptions instance", function (this: RealmContext) {
          const subs = this.realm.getSubscriptions();
          subs.update((mutableSubs) => {
            mutableSubs.add(this.realm.objects(PersonSchema.name));
          });

          expect(subs.snapshot()).to.have.length(1);
        });

        it("does not mutate another Subscriptions instance", function (this: RealmContext) {
          const subs = this.realm.getSubscriptions();
          const subs2 = this.realm.getSubscriptions();
          subs.update((mutableSubs) => {
            mutableSubs.add(this.realm.objects(PersonSchema.name));
          });

          expect(subs2.snapshot()).to.have.length(0);
        });

        it("does not wait for subscriptions to be in a ready state", function (this: RealmContext) {
          const subs = this.realm.getSubscriptions();
          subs.update((mutableSubs) => {
            mutableSubs.add(this.realm.objects(PersonSchema.name));
          });

          expect(subs.state).to.equal(Realm.App.Sync.SubscriptionsState.Pending);
        });

        it("handles multiple updates in a single batch", function (this: RealmContext) {
          const { subs, query } = addPersonSubscription(this.realm);

          subs.update((mutableSubs) => {
            mutableSubs.remove(query);
            mutableSubs.add(this.realm.objects(PersonSchema.name).filtered("age < 10"));
            mutableSubs.add(this.realm.objects(PersonSchema.name).filtered("age > 20"));
            mutableSubs.add(this.realm.objects(DogSchema.name).filtered("age > 30"));
          });

          expect(subs.snapshot()).to.have.length(3);

          expect(subs.snapshot()[0].queryString).to.equal("age < 10");
          expect(subs.snapshot()[0].objectType).to.equal(PersonSchema.name);

          expect(subs.snapshot()[1].queryString).to.equal("age > 20");
          expect(subs.snapshot()[1].objectType).to.equal(PersonSchema.name);

          expect(subs.snapshot()[2].queryString).to.equal("age > 30");
          expect(subs.snapshot()[2].objectType).to.equal(DogSchema.name);
        });

        it("handles multiple updates in multiple batches", function (this: RealmContext) {
          const { subs, query } = addPersonSubscription(this.realm);

          subs.update((mutableSubs) => {
            mutableSubs.remove(query);
            mutableSubs.add(this.realm.objects(PersonSchema.name).filtered("age < 10"));
          });

          subs.update((mutableSubs) => {
            mutableSubs.add(this.realm.objects(PersonSchema.name).filtered("age > 20"));
            mutableSubs.add(this.realm.objects(DogSchema.name).filtered("age > 30"));
          });

          expect(subs.snapshot()).to.have.length(3);

          expect(subs.snapshot()[0].queryString).to.equal("age < 10");
          expect(subs.snapshot()[0].objectType).to.equal(PersonSchema.name);

          expect(subs.snapshot()[1].queryString).to.equal("age > 20");
          expect(subs.snapshot()[1].objectType).to.equal(PersonSchema.name);

          expect(subs.snapshot()[2].queryString).to.equal("age > 30");
          expect(subs.snapshot()[2].objectType).to.equal(DogSchema.name);
        });

        xit("does not apply any updates in a batch if one errors", async function (this: RealmContext) {
          const { subs } = addPersonSubscription(this.realm);

          try {
            subs.update((mutableSubs) => {
              mutableSubs.add(this.realm.objects(PersonSchema.name).filtered("age < 10"));
              mutableSubs.add(this.realm.objects(PersonSchema.name).filtered("error > 20"));
              mutableSubs.add(this.realm.objects(DogSchema.name).filtered("age > 30"));
            });
          } catch (e) {
            // Error is expected as `error` field does not exist
          }

          await subs.waitForSynchronization();

          expect(subs.snapshot()).to.have.length(1);
          expect(subs.snapshot()[0].queryString).to.equal("TRUEPREDICATE");
        });
      });

      describe("#add", function () {
        // TODO test that anon does not replace named https://github.com/realm/realm-core/commit/e038483865c9e98e08294bf9128dfb83569ec395

        it("returns a subscription object", function (this: RealmContext) {
          const { sub } = addPersonSubscription(this.realm);
          expect(sub).is.instanceOf(Realm.App.Sync.Subscription);
        });

        it("does not add a second identical subscription with no name", function (this: RealmContext) {
          addPersonSubscription(this.realm);
          const { subs } = addPersonSubscription(this.realm);

          expect(subs.snapshot()).to.have.lengthOf(1);
        });

        it("does add a second identical subscription with a different name", function (this: RealmContext) {
          addPersonSubscription(this.realm, { name: "test1" });
          const { subs } = addPersonSubscription(this.realm, { name: "test2" });

          expect(subs.snapshot()).to.have.lengthOf(2);
          expect(subs.snapshot()[0].name).to.equal("test1");
          expect(subs.snapshot()[1].name).to.equal("test2");
        });

        it("does not add a second identical subscription with the same name", function (this: RealmContext) {
          addPersonSubscription(this.realm, { name: "test" });
          const { subs } = addPersonSubscription(this.realm, { name: "test" });

          expect(subs.snapshot()).to.have.lengthOf(1);
        });

        it("adds a second subscription with the same object type and a different filter", function (this: RealmContext) {
          addSubscription(this.realm, this.realm.objects(PersonSchema.name));
          const { subs } = addSubscription(this.realm, this.realm.objects(PersonSchema.name).filtered("age > 10"));

          expect(subs.snapshot()).to.have.lengthOf(2);
        });

        it("updates an existing subscription with the same name and different query", function (this: RealmContext) {
          addSubscription(this.realm, this.realm.objects(PersonSchema.name), { name: "test" });
          const { subs } = addSubscription(this.realm, this.realm.objects(PersonSchema.name).filtered("age > 10"), {
            name: "test",
          });

          expect(subs.snapshot()).to.have.lengthOf(1);
          expect(subs.snapshot()[0].queryString).to.equal("age > 10");
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

            expect(this.realm.getSubscriptions().snapshot()).to.have.lengthOf(1);
          });

          it("throws and does not add the subscription if a subscription with the same name but different query is added, and throwOnUpdate is true", function (this: RealmContext) {
            const { subs } = addPersonSubscription(this.realm, { name: "test" });
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
            const { subs } = addPersonSubscription(realm, { name: "test" });
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
          const { subs } = addPersonSubscription(this.realm);

          subs.update((mutableSubs) => {
            expect(mutableSubs.removeByName("test")).to.be.false;
          });

          expect(subs.empty).to.be.false;
        });

        it("returns true and removes the subscription if the subscription is found", function (this: RealmContext) {
          const { subs } = addPersonSubscription(this.realm, { name: "test" });

          subs.update((mutableSubs) => {
            expect(mutableSubs.removeByName("test")).to.be.true;
          });

          expect(subs.empty).to.be.true;
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
          const { subs, query } = addPersonSubscription(this.realm);

          subs.update((mutableSubs) => {
            expect(mutableSubs.remove(query)).to.be.true;
          });

          expect(subs.empty).to.be.true;
        });
      });

      describe("#removeSubscription", function () {
        it("returns false if the subscription is not found", function (this: RealmContext) {
          const { subs, sub } = addPersonSubscription(this.realm);

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
          const { subs, sub } = addPersonSubscription(this.realm);

          subs.update((mutableSubs) => {
            expect(mutableSubs.removeSubscription(sub)).to.be.true;
          });

          expect(subs.empty).to.be.true;
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
          addPersonSubscription(this.realm);
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
          const { subs } = addPersonSubscription(this.realm);

          subs.update((mutableSubs) => {
            expect(mutableSubs.removeByObjectType(DogSchema.name)).to.equal(0);
          });

          expect(subs.empty).to.be.false;
        });

        it("removes all subscriptions for the object type and returns the number of subscriptions removed", function (this: RealmContext) {
          addPersonSubscription(this.realm);
          addSubscription(this.realm, this.realm.objects(PersonSchema.name).filtered("age > 10"));
          const { subs } = addSubscription(this.realm, this.realm.objects(DogSchema.name));

          subs.update((mutableSubs) => {
            expect(mutableSubs.removeByObjectType(PersonSchema.name)).to.equal(2);
          });

          expect(subs.empty).to.be.false;
        });

        it("removes several subscriptions", function (this: RealmContext) {
          addSubscription(this.realm, this.realm.objects(PersonSchema.name).filtered("age > 15"));
          addSubscription(this.realm, this.realm.objects(PersonSchema.name).filtered("name == 'John'"));
          addSubscription(this.realm, this.realm.objects(PersonSchema.name).filtered("name BEGINSWITH 'A'"));

          const subs = this.realm.getSubscriptions();

          expect(subs.snapshot()).to.have.length(3);

          subs.update((mutableSubs) => {
            mutableSubs.remove(this.realm.objects(PersonSchema.name).filtered("name == 'John'"));
            mutableSubs.remove(this.realm.objects(PersonSchema.name).filtered("name BEGINSWITH 'A'"));
          });

          expect(subs.snapshot()).to.have.length(1);
        });
      });

      describe("persistence", function () {
        it("persists subscriptions when the Realm is reopened", async function (this: RealmContext) {
          addPersonSubscription(this.realm);
          expect(this.realm.getSubscriptions().snapshot()).to.have.length(1);
          this.realm.close();

          const { realm } = await openRealm(realmConfig, this.user, this.nonce);
          expect(realm.getSubscriptions().snapshot()).to.have.length(1);
        });
      });
    });
  });

  describe("synchronising data", function () {
    async function addPersonAndWaitForSync(realm: Realm) {
      let person: Person;
      realm.write(function () {
        person = realm.create<IPerson>(PersonSchema.name, { _id: new BSON.ObjectId(), name: "Tom", age: 36 });
      });

      await realm.getSubscriptions().waitForSynchronization();

      return { person, id: person._id };
    }

    async function addPersonAndResyncWithSubscription(
      realm: Realm,
      config: Realm.Configuration,
      queryFn: (realm: Realm) => Realm.Results<Realm.Object>,
      // subsUpdateFn: (mutableSubs: Realm.App.Sync.MutableSubscriptions) => void,
    ) {
      realm.getSubscriptions().update((m) => m.add(queryFn(realm)));
      await realm.getSubscriptions().waitForSynchronization();

      const { id } = await addPersonAndWaitForSync(realm);

      const newRealm = closeAndReopenRealm(realm, config);
      expect(newRealm.objectForPrimaryKey(PersonSchema.name, id)).to.be.undefined;

      newRealm.getSubscriptions().update((m) => m.add(queryFn(newRealm)));
      await newRealm.getSubscriptions().waitForSynchronization();

      return { id, newRealm };
    }

    it("syncs added items to a subscribed collection", async function (this: RealmContext) {
      const { id, newRealm } = await addPersonAndResyncWithSubscription(this.realm, this.config, (r) =>
        r.objects(PersonSchema.name),
      );

      expect(newRealm.objectForPrimaryKey(PersonSchema.name, id)).to.not.be.undefined;
    });

    it("syncs added items to a subscribed collection with a filter", async function (this: RealmContext) {
      const { id, newRealm } = await addPersonAndResyncWithSubscription(this.realm, this.config, (r) =>
        r.objects(PersonSchema.name).filtered("age > 30"),
      );

      expect(newRealm.objectForPrimaryKey(PersonSchema.name, id)).to.not.be.undefined;
    });

    it("does not sync added items not matching the filter", async function (this: RealmContext) {
      const { id, newRealm } = await addPersonAndResyncWithSubscription(this.realm, this.config, (r) =>
        r.objects(PersonSchema.name).filtered("age < 30"),
      );

      expect(newRealm.objectForPrimaryKey(PersonSchema.name, id)).to.be.undefined;
    });

    // Waiting on https://jira.mongodb.org/browse/REALMC-10860
    xit("deletes local items not matching the filter", async function (this: RealmContext) {
      const { id, newRealm } = await addPersonAndResyncWithSubscription(this.realm, this.config, (r) =>
        this.realm.objects(PersonSchema.name).filtered("age < 30"),
      );

      expect(newRealm.objectForPrimaryKey(PersonSchema.name, id)).to.be.undefined;
    });

    it("syncs existing items when a subscription is added", async function (this: RealmContext) {
      let person: Person;

      const realm = this.realm;
      realm.write(function () {
        person = realm.create<IPerson>(PersonSchema.name, { _id: new BSON.ObjectId(), name: "Tom", age: 36 });
      });
      const id = person._id;

      addPersonSubscription(this.realm);
      await this.realm.getSubscriptions().waitForSynchronization();

      const newRealm = closeAndReopenRealm(this.realm, this.config);
      expect(newRealm.objectForPrimaryKey(PersonSchema.name, id)).to.be.undefined;

      addPersonSubscription(newRealm);
      await newRealm.getSubscriptions().waitForSynchronization();

      expect(newRealm.objectForPrimaryKey(PersonSchema.name, id)).to.not.be.undefined;
    });

    it("starts syncing items if the filter changes to match some items", async function (this: RealmContext) {
      const { id, newRealm } = await addPersonAndResyncWithSubscription(this.realm, this.config, (r) =>
        r.objects(PersonSchema.name).filtered("age < 30"),
      );
      expect(newRealm.objectForPrimaryKey(PersonSchema.name, id)).to.be.undefined;

      const subs = newRealm.getSubscriptions();
      subs.update((mutableSubs) => {
        mutableSubs.removeAll();
        mutableSubs.add(newRealm.objects(PersonSchema.name).filtered("age > 30"));
      });
      await subs.waitForSynchronization();

      expect(newRealm.objectForPrimaryKey(PersonSchema.name, id)).to.not.be.undefined;
    });

    it("stops syncing items when a subscription is removed", async function (this: RealmContext) {
      const { id, newRealm } = await addPersonAndResyncWithSubscription(this.realm, this.config, (r) =>
        r.objects(PersonSchema.name),
      );
      expect(newRealm.objectForPrimaryKey(PersonSchema.name, id)).to.not.be.undefined;

      const subs = newRealm.getSubscriptions();
      subs.update((mutableSubs) => {
        mutableSubs.removeAll;
      });
      await subs.waitForSynchronization();

      expect(newRealm.objectForPrimaryKey(PersonSchema.name, id)).to.be.undefined;
    });

    it("stops syncing items if the filter changes to not match some items", async function (this: RealmContext) {
      const { id, newRealm } = await addPersonAndResyncWithSubscription(this.realm, this.config, (r) =>
        r.objects(PersonSchema.name).filtered("age > 30"),
      );
      expect(newRealm.objectForPrimaryKey(PersonSchema.name, id)).to.not.be.undefined;

      const subs = newRealm.getSubscriptions();
      subs.update((mutableSubs) => {
        mutableSubs.removeAll();
        mutableSubs.add(newRealm.objects(PersonSchema.name).filtered("age < 30"));
      });
      await subs.waitForSynchronization();

      expect(newRealm.objectForPrimaryKey(PersonSchema.name, id)).to.be.undefined;
    });
  });
});
