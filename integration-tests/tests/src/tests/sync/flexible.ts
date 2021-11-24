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
import Realm from "realm";

import { authenticateUserBefore, importAppBefore, openRealmBeforeEach } from "../../hooks";
import { DogSchema, PersonSchema } from "../../schemas/person-and-dog-with-object-ids";
import { itUploadsDeletesAndDownloads } from "./upload-delete-download";

describe("Flexible sync", function () {
  importAppBefore("with-db");
  authenticateUserBefore();
  openRealmBeforeEach({ schema: [PersonSchema, DogSchema], sync: { flexible: true } });

  describe("local tests", function () {
    function addPersonSubscription(
      _this: Partial<RealmContext>,
      options: Realm.App.Sync.SubscriptionOptions = undefined,
    ) {
      return addSubscription(_this, _this.realm.objects("Person"), options);
    }

    function addSubscription(
      _this: Partial<RealmContext>,
      query: Realm.Results<any>,
      options: Realm.App.Sync.SubscriptionOptions = undefined,
    ) {
      const existingSubs = _this.realm.getSubscriptions();
      let sub: Realm.App.Sync.Subscription;

      const subs = existingSubs.update((mutableSubs) => {
        sub = mutableSubs.add(query, options);
      });

      return { subs, sub, query };
    }

    describe("Realm.getSubscriptions()", function () {
      it("returns a Subscriptions instance", function (this: RealmContext) {
        expect(this.realm.getSubscriptions()).to.be.instanceOf(Realm.App.Sync.Subscriptions);
      });

      it("returns the correct queries when multiple queries are added in a single update call", function (this: RealmContext) {
        let sub1: Realm.App.Sync.Subscription;
        let sub2: Realm.App.Sync.Subscription;
        let sub3: Realm.App.Sync.Subscription;
        const subs = this.realm.getSubscriptions();
        const realm = this.realm;

        subs.update((mutableSubs: any) => {
          sub1 = mutableSubs.add(realm.objects("Person").filtered("age > 15"));
          sub2 = mutableSubs.add(realm.objects("Person").filtered("age > 20"));
          sub3 = mutableSubs.add(realm.objects("Person").filtered("age > 25"));
        });

        expect(sub1.queryString).to.equal("age > 15");
        expect(sub2.queryString).to.equal("age > 20");
        expect(sub3.queryString).to.equal("age > 25");
      });

      it("returns the correct queries when multiple queries are added in multiple update calls", function (this: RealmContext) {
        const sub1 = addSubscription(this, this.realm.objects("Person").filtered("age > 30")).sub;
        expect(sub1.queryString).to.equal("age > 30");

        const sub2 = addSubscription(this, this.realm.objects("Person").filtered("age > 35")).sub;
        expect(sub2.queryString).to.equal("age > 35");

        const sub3 = addSubscription(this, this.realm.objects("Person").filtered("age > 40")).sub;
        expect(sub3.queryString).to.equal("age > 40");
      });
    });

    describe("Subscription", function () {
      it("has a createdAt date", function (this: RealmContext) {
        const sub = addPersonSubscription(this).sub;
        expect(sub.createdAt).to.be.instanceOf(Date);
      });

      it("has an updatedAt date", function (this: RealmContext) {
        const sub = addPersonSubscription(this).sub;
        expect(sub.updatedAt).to.be.instanceOf(Date);
      });

      it("has a default name", function (this: RealmContext) {
        const sub = addPersonSubscription(this).sub;
        expect(sub.name).to.equal(null);
      });

      it("has a specified name", function (this: RealmContext) {
        const subWithName = addPersonSubscription(this, { name: "test" }).sub;
        expect(subWithName.name).to.equal("test");
      });

      it("has an objectType", function (this: RealmContext) {
        const sub = addPersonSubscription(this).sub;
        expect(sub.objectType).to.equal("Person");
      });

      it("has a default query", function (this: RealmContext) {
        const sub = addPersonSubscription(this).sub;
        expect(sub.queryString).to.equal("TRUEPREDICATE");
      });

      it("has a specified query", function (this: RealmContext) {
        const subWithFilter = addSubscription(this, this.realm.objects("Person").filtered("age > 10")).sub;
        expect(subWithFilter.queryString).to.equal("age > 10");
      });
    });

    describe("Subscriptions", function () {
      describe("#version", function () {
        it("starts at 0", function () {
          expect(this.realm.getSubscriptions().version).to.equal(0);
        });

        it("is incremented in the new returned Subscriptions", function (this: RealmContext) {
          expect(this.realm.getSubscriptions().version).to.equal(0);
          const { subs } = addPersonSubscription(this);
          expect(subs.version).to.equal(1);
        });

        it("is not incremented in the original Subscriptions", function (this: RealmContext) {
          const subs = this.realm.getSubscriptions();
          expect(subs.version).to.equal(0);
          addPersonSubscription(this);
          expect(subs.version).to.equal(0);
        });
      });

      describe("#empty", function () {
        it("returns true if no subscriptions exist", function (this: RealmContext) {
          expect(this.realm.getSubscriptions().empty).to.be.true;
        });

        it("returns false if subscriptions exist", function (this: RealmContext) {
          const { subs } = addPersonSubscription(this);

          expect(subs.empty).to.be.false;
        });

        it("returns true if a subscription is added then removed", function (this: RealmContext) {
          const subs = this.realm.getSubscriptions();
          let sub: Realm.App.Sync.Subscription;

          expect(subs.empty).to.be.true;

          let newSubs = subs.update((mutableSubs) => {
            sub = mutableSubs.add(this.realm.objects("Person"));
          });

          expect(newSubs.empty).to.be.false;

          newSubs = subs.update((mutableSubs) => {
            mutableSubs.removeSubscription(sub);
          });

          expect(newSubs.empty).to.be.true;
        });
      });

      describe("#findByName", function () {
        it("returns null if the named subscription does not exist", function (this: RealmContext) {
          expect(this.realm.getSubscriptions().findByName("test")).to.be.null;
        });

        it("returns the named subscription", function (this: RealmContext) {
          const { subs, sub } = addPersonSubscription(this, { name: "test" });

          expect(subs.findByName("test")).to.deep.equal(sub);
        });
      });

      describe("#find", function () {
        it("returns null if the query is not subscribed to", function (this: RealmContext) {
          expect(this.realm.getSubscriptions().find(this.realm.objects("Person"))).to.be.null;
        });

        it("returns a query's subscription by reference", function (this: RealmContext) {
          const { subs, sub, query } = addPersonSubscription(this);

          // TODO check by ID once https://jira.mongodb.org/browse/RCORE-874 is done
          expect(subs.find(query)).to.deep.equal(sub);
        });

        it("returns a filtered query's subscription", function (this: RealmContext) {
          const query = this.realm.objects("Person").filtered("age > 10");
          const { subs, sub } = addSubscription(this, query);

          expect(subs.find(query)).to.deep.equal(sub);
        });

        it("returns a sorted query's subscription", function (this: RealmContext) {
          const query = this.realm.objects("Person").sorted("age");
          const { subs, sub } = addSubscription(this, query);

          expect(subs.find(query)).to.deep.equal(sub);
        });

        it("returns a filtered and sorted query's subscription", function (this: RealmContext) {
          const query = this.realm.objects("Person").sorted("age");
          const { subs, sub } = addSubscription(this, query);

          expect(subs.find(query)).to.deep.equal(sub);
        });

        it("returns a query with equivalent RQL respresentation's subscription", function (this: RealmContext) {
          const { subs, sub } = addPersonSubscription(this);

          expect(subs.find(this.realm.objects("Person"))).to.deep.equal(sub);
        });

        describe("#state", function () {
          it("is Pending by default", function (this: RealmContext) {
            const subs = this.realm.getSubscriptions();
            expect(subs.state).to.equal(Realm.App.Sync.SubscriptionState.Pending);
          });

          // TODO test that uncommitted/pending/bootstrapping all map to pending
          // TODO test Superceded when we update the set
          // TODO can you call waitForSync on a superceeded set?
          // TOOD do we want to duplicate tests from waitForSynchronization here?
        });

        describe("#error", function () {
          it("is null by default", function (this: RealmContext) {
            const subs = this.realm.getSubscriptions();
            expect(subs.error).to.be.null;
          });

          // TODO waiting on core - currently calling waitForSynchronization crashes when test times out
          xit("is null if there was no error synchronising subscriptions", async function (this: RealmContext) {
            const { subs } = addPersonSubscription(this);
            await subs.waitForSynchronization();

            expect(subs.error).to.be.null;
          });

          xit("is contains the error if there was an error synchronising subscriptions", async function (this: RealmContext) {
            const { subs } = addPersonSubscription(this);
            // TODO simulate error
            await subs.waitForSynchronization();

            expect(subs.error).to.be.instanceOf(Error);
            // TODO check more stuff about the error
          });
        });

        // TODO waiting on core - currently calling waitForSynchronization crashes when test times out
        xdescribe("#waitForSynchronization", function () {
          it("returns a promise", async function (this: RealmContext) {
            const { subs } = addPersonSubscription(this);

            expect(subs.waitForSynchronization()).to.be.instanceOf(Promise);
          });

          it("waits for subscriptions to be in a complete state", async function (this: RealmContext) {
            const { subs } = addPersonSubscription(this);
            expect(subs.state).to.equal(Realm.App.Sync.SubscriptionState.Pending);

            await subs.waitForSynchronization();

            expect(subs.state).to.equal(Realm.App.Sync.SubscriptionState.Complete);
          });

          it("resolves if subscriptions are already in a complete state", async function (this: RealmContext) {
            const { subs } = addPersonSubscription(this);
            await subs.waitForSynchronization();
            await subs.waitForSynchronization();

            expect(subs.state).to.equal(Realm.App.Sync.SubscriptionState.Complete);
          });

          it("throws if there is an error synchronising subscriptions", async function (this: RealmContext) {
            const { subs } = addPersonSubscription(this);
            expect(subs.state).to.equal(Realm.App.Sync.SubscriptionState.Pending);

            // TODO simulate error
            await subs.waitForSynchronization();

            expect(subs.state).to.equal(Realm.App.Sync.SubscriptionState.Error);
          });

          it("throws if another client updates subscriptions while waiting for synchronisation", function (this: RealmContext) {
            // TODO what is the proper way to do this?
            const otherClientRealm = new Realm({ schema: [PersonSchema], sync: { flexible: true, user: this.user } });

            const { subs } = addPersonSubscription(this);

            const otherClientSubs = otherClientRealm.getSubscriptions();

            expect(
              Promise.all([
                otherClientSubs.update((mutableSubs) => {
                  mutableSubs.add(this.realm.objects("Person"));
                }),
                subs.waitForSynchronization(),
              ]),
            ).throws("xxx");
            expect(subs.state).to.equal(Realm.App.Sync.SubscriptionState.Error);
          });
        });

        describe("#update", function () {
          // TODO handle rollback

          it("throws an error if Subscriptions.add is called outside of an update() callback", function (this: RealmContext) {
            const subs = this.realm.getSubscriptions();

            expect(() => {
              (subs as Realm.App.Sync.MutableSubscriptions).add(this.realm.objects("Person"));
            }).throws("Subscriptions can only be added inside an `update` callback.");
          });

          it("throws an error if Subscriptions.remove is called outside of an update() callback", function (this: RealmContext) {
            const { subs, query } = addPersonSubscription(this);

            expect(() => {
              (subs as Realm.App.Sync.MutableSubscriptions).remove(query);
            }).throws("Subscriptions can only be removed inside an `update` callback.");
          });

          it("throws an error if Subscriptions.removeByName is called outside of an update() callback", function (this: RealmContext) {
            const { subs } = addPersonSubscription(this);

            expect(() => {
              (subs as Realm.App.Sync.MutableSubscriptions).removeByName("test");
            }).throws("Subscriptions can only be removed inside an `update` callback.");
          });

          it("throws an error if Subscriptions.removeSubscription is called outside of an update() callback", function (this: RealmContext) {
            const { subs, sub } = addPersonSubscription(this);

            expect(() => {
              (subs as Realm.App.Sync.MutableSubscriptions).removeSubscription(sub);
            }).throws("Subscriptions can only be removed inside an `update` callback.");
          });

          it("throws an error if Subscriptions.removeAll is called outside of an update() callback", function (this: RealmContext) {
            const { subs } = addPersonSubscription(this);

            expect(() => {
              (subs as Realm.App.Sync.MutableSubscriptions).removeAll();
            }).throws("Subscriptions can only be removed inside an `update` callback.");
          });

          it("throws an error if Subscriptions.removeByObjectType is called outside of an update() callback", function (this: RealmContext) {
            const { subs } = addPersonSubscription(this);

            expect(() => {
              (subs as Realm.App.Sync.MutableSubscriptions).removeByObjectType("test");
            }).throws("Subscriptions can only be removed inside an `update` callback.");
          });

          describe("#update", function () {
            it("does not throw an error if Subscriptions.add is called inside a update() callback", function (this: RealmContext) {
              const subs = this.realm.getSubscriptions();

              // expect(() => {
              subs.update((mutableSubs) => {
                mutableSubs.add(this.realm.objects("Person"));
              });
              // }).to.not.throw();
            });

            it("does not throw an error if Subscriptions.remove is called inside a update() callback", function (this: RealmContext) {
              const { sub, subs } = addPersonSubscription(this);

              expect(() => {
                subs.update((mutableSubs) => {
                  mutableSubs.removeSubscription(sub);
                });
              }).to.not.throw();
            });

            it("returns an updated Subscriptions instance", function (this: RealmContext) {
              const subs = this.realm.getSubscriptions();
              const newSubs = subs.update((mutableSubs) => {
                mutableSubs.add(this.realm.objects("Person"));
              });

              expect(newSubs.snapshot()).to.have.length(1);
            });

            it("does not mutate the original Subscriptions instance", function (this: RealmContext) {
              const subs = this.realm.getSubscriptions();
              subs.update((mutableSubs) => {
                mutableSubs.add(this.realm.objects("Person"));
              });

              expect(subs.snapshot()).to.have.length(0);
            });

            it("does not wait for subscriptions to be in a ready state", function (this: RealmContext) {
              const subs = this.realm.getSubscriptions();
              subs.update((mutableSubs) => {
                mutableSubs.add(this.realm.objects("Person"));
              });

              expect(subs.state).to.equal(Realm.App.Sync.SubscriptionState.Pending);
            });

            it("handles multiple updates in a single batch", function (this: RealmContext) {
              const { subs, query } = addPersonSubscription(this);

              const newSubs = subs.update((mutableSubs) => {
                mutableSubs.remove(query);
                mutableSubs.add(this.realm.objects("Person").filtered("age < 10"));
                mutableSubs.add(this.realm.objects("Person").filtered("age > 20"));
                mutableSubs.add(this.realm.objects("Dog").filtered("age > 30"));
              });

              expect(newSubs.snapshot()).to.have.length(3);

              expect(newSubs.snapshot()[0].queryString).to.equal("age < 10");
              expect(newSubs.snapshot()[0].objectType).to.equal("Person");

              expect(newSubs.snapshot()[1].queryString).to.equal("age > 20");
              expect(newSubs.snapshot()[1].objectType).to.equal("Person");

              expect(newSubs.snapshot()[2].queryString).to.equal("age > 30");
              expect(newSubs.snapshot()[2].objectType).to.equal("Dog");
            });
          });
        });

        // TODO test `snapshot`

        describe("#add", function () {
          // Behaviour is mostly tested in #find and #findByName - TODO should we retest?

          it("returns a subscription object", function (this: RealmContext) {
            const { sub } = addPersonSubscription(this);
            expect(sub).is.instanceOf(Realm.App.Sync.Subscription);
          });

          describe("#throwOnUpdate", function () {
            it("does not throw if a subscription with the same name and same query is added, and throwOnUpdate is true", function (this: RealmContext) {
              const query = this.realm.objects("Dog");
              const { subs } = addSubscription(this, query, { name: "test" });

              expect(() => {
                subs.update((mutableSubs) => {
                  mutableSubs.add(query, { name: "test", throwOnUpdate: true });
                });
              }).to.not.throw();
            });

            it("throws and does not add the subscription if a subscription with the same name but different query is added, and throwOnUpdate is true", function (this: RealmContext) {
              const { subs } = addPersonSubscription(this, { name: "test" });
              const query = this.realm.objects("Dog");

              expect(() => {
                subs.update((mutableSubs) => {
                  mutableSubs.add(query, { name: "test", throwOnUpdate: true });
                });
              }).to.throw(
                "A subscription with the name 'test' already exists but has a different query. If you meant to update it, remove `throwOnUpdate: true` from the subscription options.",
              );

              expect(subs.find(query)).to.be.null;
            });

            function testThrowOnUpdateFalse(
              _this: Partial<RealmContext>,
              addOptions: Realm.App.Sync.SubscriptionOptions = {},
            ) {
              const { subs } = addPersonSubscription(_this, { name: "test" });
              const query = _this.realm.objects("Dog");

              expect(() => {
                subs.update((mutableSubs) => {
                  mutableSubs.add(query, { name: "test", ...addOptions });
                });
              }).to.not.throw;
            }

            it("updates the existing subscription if a subscription with the same name but different query is added, and throwOnUpdate is true", function (this: RealmContext) {
              testThrowOnUpdateFalse(this, { throwOnUpdate: false });
            });

            it("updates the existing subscription if a subscription with the same name but different query is added, and throwOnUpdate is not specified", function (this: RealmContext) {
              testThrowOnUpdateFalse(this);
            });
          });
        });

        describe("#removeByName", function () {
          it("returns false and does not remove any subscriptions if the subscription is not found", function (this: RealmContext) {
            const { subs } = addPersonSubscription(this);

            const newSubs = subs.update((mutableSubs) => {
              expect(mutableSubs.removeByName("test")).to.be.false;
            });

            expect(newSubs.empty).to.be.false;
          });

          it("returns true and removes the subscription if the subscription is found", function (this: RealmContext) {
            const { subs } = addPersonSubscription(this, { name: "test" });

            const newSubs = subs.update((mutableSubs) => {
              expect(mutableSubs.removeByName("test")).to.be.true;
            });

            expect(newSubs.empty).to.be.true;
          });
        });

        describe("#remove", function () {
          it("returns false and does not remove any subscriptions if the subscription for the query is not found", function (this: RealmContext) {
            const query = this.realm.objects("Person");
            const query2 = this.realm.objects("Dog");

            const { subs } = addSubscription(this, query);

            const newSubs = subs.update((mutableSubs) => {
              expect(mutableSubs.remove(query2)).to.be.false;
            });

            expect(newSubs.empty).to.be.false;
          });

          it("returns true and removes the subscription for the query if it is found", function (this: RealmContext) {
            const { subs, query } = addPersonSubscription(this);

            const newSubs = subs.update((mutableSubs) => {
              expect(mutableSubs.remove(query)).to.be.true;
            });

            expect(newSubs.empty).to.be.true;
          });
        });

        describe("#removeSubscription", function () {
          it("returns false if the subscription is not found", function (this: RealmContext) {
            const { subs, sub } = addPersonSubscription(this);
            let newSubs = subs.update((mutableSubs) => {
              mutableSubs.add(this.realm.objects("Dog"));
            });
            newSubs = newSubs.update((mutableSubs) => {
              mutableSubs.removeSubscription(sub);
            });

            newSubs = newSubs.update((mutableSubs) => {
              expect(mutableSubs.removeSubscription(sub)).to.be.false;
            });

            expect(newSubs.empty).to.be.false;
          });

          // TODO waiting on https://jira.mongodb.org/browse/RCORE-874
          it("returns true and removes the subscription if the subscription is found", function (this: RealmContext) {
            const { subs, sub } = addPersonSubscription(this);

            const newSubs = subs.update((mutableSubs) => {
              expect(mutableSubs.removeSubscription(sub)).to.be.true;
            });

            expect(newSubs.empty).to.be.true;
          });
        });

        describe("#removeAll", function () {
          it("returns 0 if no subscriptions exist", function (this: RealmContext) {
            const subs = this.realm.getSubscriptions();

            subs.update((mutableSubs) => {
              expect(mutableSubs.removeAll()).to.equal(0);
            });
          });

          it("removes all subscriptions and returns the number of subscriptions removed", function (this: RealmContext) {
            addPersonSubscription(this);
            const { subs } = addSubscription(this, this.realm.objects("Person").filtered("age > 10"));

            const newSubs = subs.update((mutableSubs) => {
              expect(mutableSubs.removeAll()).to.equal(2);
            });

            expect(newSubs.empty).to.be.true;
          });
        });

        describe("#removeByObjectType", function () {
          it("returns 0 if no subscriptions for the object type exist", function (this: RealmContext) {
            const { subs } = addPersonSubscription(this);

            const newSubs = subs.update((mutableSubs) => {
              expect(mutableSubs.removeByObjectType("Dog")).to.equal(0);
            });

            expect(newSubs.empty).to.be.false;
          });

          // TODO https://jira.mongodb.org/browse/RCORE-878
          it("removes all subscriptions for the object type and returns the number of subscriptions removed", function (this: RealmContext) {
            addPersonSubscription(this);
            addSubscription(this, this.realm.objects("Person").filtered("age > 10"));
            const { subs } = addSubscription(this, this.realm.objects("Dog"));

            const newSubs = subs.update((mutableSubs) => {
              expect(mutableSubs.removeByObjectType("Person")).to.equal(2);
            });

            expect(newSubs.empty).to.be.false;
          });
        });

        describe("multi-client behaviour", function () {
          // TODO Is this worth testing? Implied by immutability...
          it("does not automatically update if another client updates subscriptions after we call getSubscriptions", function (this: RealmContext) {
            const subs = this.realm.getSubscriptions();
            expect(subs.empty).to.be.true;

            // TODO what is the proper way to do this?
            const otherClientRealm = new Realm({
              schema: [PersonSchema],
              sync: { flexible: true, user: this.user },
            });
            const otherClientSubs = otherClientRealm.getSubscriptions();
            const newOtherClientSubs = otherClientSubs.update((mutableSubs) => {
              mutableSubs.add(otherClientRealm.objects("Person"));
            });

            // TODO prob need to get a new snapshot, is this test even valid
            expect(newOtherClientSubs.empty).to.be.false;
            expect(subs.empty).to.be.true;
          });

          it("sees another client's updated subscriptions if we call getSubscriptions after they are modified", function (this: RealmContext) {
            const subs = this.realm.getSubscriptions();
            expect(subs.empty).to.be.true;

            // TODO what is the proper way to do this?
            const otherClientRealm = new Realm({
              schema: [PersonSchema],
              sync: { flexible: true, user: this.user },
            });
            const otherClientSubs = otherClientRealm.getSubscriptions();
            const newOtherClientSubs = otherClientSubs.update((mutableSubs) => {
              mutableSubs.add(otherClientRealm.objects("Person"));
            });

            const newSubs = this.realm.getSubscriptions();

            expect(newOtherClientSubs.empty).to.be.false;
            expect(newSubs.empty).to.be.false;
          });
        });
      });
    });
  });

  /*describe("synchronisation tests", function () {
    async function addSubscriptionAndPerson(query: Realm.Results<any>) {
      const { subs } = addSubscription(this, query);
      await subs.waitForSynchronization();

      expect(this.realm.objects("Person")).to.have.length(0);

      this.realm.write(() => {
        // this.realm.create<IPerson>("Person", { name: "Tom", age: 36 });
      });

      itUploadsDeletesAndDownloads();
    }

    it("syncs added items to a subscribed collection", async function (this: RealmContext) {
      await addSubscriptionAndPerson(this.realm.objects("Person"));

      expect(this.realm.objects("Person")).to.have.length(1);
    });

    it("syncs added items to a subscribed collection with a filter", async function (this: RealmContext) {
      await addSubscriptionAndPerson(this.realm.objects("Person").filtered("age > 30"));

      expect(this.realm.objects("Person")).to.have.length(1);
    });

    it("does not sync added items not matching the filter", async function (this: RealmContext) {
      await addSubscriptionAndPerson(this.realm.objects("Person").filtered("age < 30"));

      expect(this.realm.objects("Person")).to.have.length(0);
    });
  });*/
});
