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

/**
 * This suite aims to test observability of Realm, Realm.Object and all collection types.
 * In particular, it aims to test:
 * - Adding a listener will call the callback on change.
 */

import { assert, expect } from "chai";
import { spy } from "sinon";

import Realm from "realm";

import { openRealmBefore, openRealmBeforeEach } from "../hooks";
import { sequence } from "../utils/sequence";
import { createPromiseChain } from "../utils/promise-chain";

type Observable = Realm | Realm.Object<any> | Realm.Results<any> | Realm.List<any> | Realm.Dictionary | Realm.Set<any>;

function expectObservableMethods(observable: Observable) {
  expect(observable.addListener).to.be.a("function");
  expect(observable.removeListener).to.be.a("function");
  expect(observable.removeAllListeners).to.be.a("function");
}

type ListenerTestOptions = {
  observable: Observable;
  eventName?: "change" | "schema" | "beforenotify";
};

type PerformChangeOptions = {
  performChange: () => void;
};

async function expectInitialCall(observable: Observable, eventName?: "change" | "schema" | "beforenotify") {
  const chain = createPromiseChain(1);
  const cb = spy(chain);
  if (observable instanceof Realm) {
    assert(eventName);
    observable.addListener(eventName, cb);
  } else {
    observable.addListener(cb);
  }
  await chain;
  return cb.getCall(0);
}

async function expectCallsListener({
  observable,
  eventName,
  performChange,
}: ListenerTestOptions & PerformChangeOptions) {
  const chain = createPromiseChain(2);
  const cb = spy(chain);
  if (observable instanceof Realm) {
    assert(eventName);
    observable.addListener(eventName, cb);
  } else {
    observable.addListener(cb);
  }

  expect(cb).to.not.have.been.called;

  // Initial call
  await chain;
  expect(cb).to.be.calledOnce;

  performChange();
  await chain;
  expect(cb).to.be.calledTwice;

  return cb.getCalls();
}

async function expectRemovesListener({
  observable,
  eventName,
  performChange,
}: ListenerTestOptions & PerformChangeOptions) {
  const chain1 = createPromiseChain();
  const cb1 = spy(chain1);

  const chain2 = createPromiseChain();
  const cb2 = spy(chain2);

  if (observable instanceof Realm) {
    assert(eventName);
    observable.addListener(eventName, cb1);
    observable.addListener(eventName, cb2);
  } else {
    observable.addListener(cb1);
    observable.addListener(cb2);
  }

  expect(cb1).to.not.have.been.called;
  expect(cb2).to.not.have.been.called;

  // Initial call
  await Promise.all([chain1, chain2]);
  expect(cb1).to.be.calledOnce;
  expect(cb2).to.be.calledOnce;

  performChange();
  await Promise.all([chain1, chain2]);
  expect(cb1).to.be.calledTwice;
  expect(cb2).to.be.calledTwice;

  if (observable instanceof Realm) {
    assert(eventName);
    observable.removeListener(eventName, cb1);
  } else {
    observable.removeListener(cb1);
  }

  performChange();
  await chain2;
  expect(cb1).to.be.calledTwice;
  expect(cb2).to.be.calledThrice;

  if (observable instanceof Realm) {
    assert(eventName);
    observable.removeAllListeners(eventName);
  } else {
    observable.removeAllListeners();
  }

  performChange();
  expect(cb1).to.be.calledTwice;
  expect(cb2).to.be.calledThrice;

  return [cb1.getCalls(), cb2.getCalls()];
}

describe("Observable", () => {
  // describe("App", () => {});

  describe("Realm", () => {
    openRealmBefore({
      schema: [
        {
          name: "Person",
          properties: {
            name: "string",
          },
        },
      ],
    });

    it("is observable", function (this: RealmContext) {
      expectObservableMethods(this.realm);
    });
  });

  describe("Object", () => {
    type Person = { name: string };
    openRealmBeforeEach({
      schema: [
        {
          name: "Person",
          properties: {
            name: "string",
          },
        },
      ],
    });

    beforeEach(function (this: RealmObjectContext<Person>) {
      this.object = this.realm.write(() => {
        return this.realm.create<Person>("Person", { name: "Alice" });
      });
    });

    it("is observable", function (this: RealmObjectContext<Person>) {
      expectObservableMethods(this.object);
    });

    it("calls listener initially", async function (this: RealmObjectContext<Person>) {
      const call = await expectInitialCall(this.object);

      expect(call.args[0]).instanceOf(Realm.Object);
      expect(call.args).deep.equals([{ name: "Alice" }, { deleted: false, changedProperties: [] }]);
    });

    it("calls listener", async function (this: RealmObjectContext<Person>) {
      const calls = await expectCallsListener({
        observable: this.object,
        performChange: () => {
          this.realm.write(() => {
            this.object.name = "Bob";
          });
        },
      });
      expect(calls).has.length(2);

      expect(calls[0].args[0]).instanceOf(Realm.Object);
      expect(calls[0].args[1]).deep.equals({ deleted: false, changedProperties: [] });

      expect(calls[1].args[0]).instanceOf(Realm.Object);
      expect(calls[1].args[1]).deep.equals({ deleted: false, changedProperties: ["name"] });
    });

    it("removes listeners", async function (this: RealmObjectContext<Person>) {
      await expectRemovesListener({
        observable: this.object,
        performChange: sequence(
          () => {
            this.realm.write(() => {
              this.object.name = "Bob";
            });
          },
          () => {
            this.realm.write(() => {
              this.object.name = "Charlie";
            });
          },
          () => {
            this.realm.write(() => {
              this.object.name = "Diana";
            });
          },
        ),
      });
    });
  });

  describe("Results", () => {
    type Person = { name: string };
    // change: with / without key-paths
    openRealmBeforeEach({
      schema: [
        {
          name: "Person",
          properties: {
            name: "string",
          },
        },
      ],
    });

    beforeEach(function (this: RealmObjectContext<Person>) {
      this.object = this.realm.write(() => {
        return this.realm.create<Person>("Person", { name: "Alice" });
      });
    });

    it("is observable", function (this: RealmObjectContext<Person>) {
      expectObservableMethods(this.realm.objects("Person"));
    });

    it("calls listener initially", async function (this: RealmObjectContext<Person>) {
      const call = await expectInitialCall(this.realm.objects("Person"));

      expect(call.args[0]).instanceOf(Realm.Results);
      expect(call.args[1]).deep.equals({
        deletions: [],
        insertions: [],
        newModifications: [],
        oldModifications: [],
      });
    });

    it("calls listener", async function (this: RealmObjectContext<Person>) {
      const calls = await expectCallsListener({
        observable: this.realm.objects("Person"),
        performChange: () => {
          this.realm.write(() => {
            this.object.name = "Bob";
          });
        },
      });
      expect(calls).has.length(2);
      const [firstCall, secondCall] = calls;

      expect(firstCall.args[0]).instanceOf(Realm.Results);
      expect(firstCall.args[1]).deep.equals({
        deletions: [],
        insertions: [],
        newModifications: [],
        oldModifications: [],
      });

      expect(secondCall.args[0]).instanceOf(Realm.Results);
      expect(secondCall.args[1]).deep.equals({
        deletions: [],
        insertions: [],
        newModifications: [0],
        oldModifications: [0],
      });
    });
  });

  describe("List", () => {
    type Person = { name: string; friends: Realm.List<Person> };
    openRealmBefore({
      schema: [
        {
          name: "Person",
          properties: {
            name: "string",
            friends: { type: "list", objectType: "Person" },
          },
        },
      ],
    });

    before(function (this: RealmObjectContext<Person>) {
      this.object = this.realm.write(() => {
        const alice = this.realm.create<Person>("Person", { name: "Alice" });
        const bob = this.realm.create<Person>("Person", { name: "Bob" });
        alice.friends.push(bob);
        return alice;
      });
    });

    it("is observable", function (this: RealmObjectContext<Person>) {
      expectObservableMethods(this.object.friends);
    });
  });

  describe("Dictionary", () => {
    type Person = { name: string; friendsByName: Realm.Dictionary<Person> };
    openRealmBefore({
      schema: [
        {
          name: "Person",
          properties: {
            name: "string",
            friendsByName: { type: "dictionary", objectType: "Person" },
          },
        },
      ],
    });

    before(function (this: RealmObjectContext<Person>) {
      this.object = this.realm.write(() => {
        const alice = this.realm.create<Person>("Person", { name: "Alice" });
        const bob = this.realm.create<Person>("Person", { name: "Bob" });
        alice.friendsByName.set({ bob });
        return alice;
      });
    });

    it("is observable", function (this: RealmObjectContext<Person>) {
      expectObservableMethods(this.object.friendsByName);
    });
  });

  describe("Set", () => {
    type Person = { name: string; friends: Realm.Set<Person> };
    openRealmBefore({
      schema: [
        {
          name: "Person",
          properties: {
            name: "string",
            friends: { type: "set", objectType: "Person" },
          },
        },
      ],
    });

    before(function (this: RealmObjectContext<Person>) {
      this.object = this.realm.write(() => {
        const alice = this.realm.create<Person>("Person", { name: "Alice" });
        const bob = this.realm.create<Person>("Person", { name: "Bob" });
        alice.friends.add(bob);
        return alice;
      });
    });

    it("is observable", function (this: RealmObjectContext<Person>) {
      expectObservableMethods(this.object.friends);
    });
  });
});
