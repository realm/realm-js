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
import Realm from "realm";
import { openRealmBeforeEach } from "../hooks";

class ListObject extends Realm.Object {
  list!: Realm.List<TestObject>;
  static schema = {
    name: "ListObject",
    properties: {
      list: { type: "list", objectType: "TestObject" },
    },
  };
}

class TestObject extends Realm.Object {
  doubleCol!: Realm.Types.Double;
  static schema = {
    name: "TestObject",
    properties: {
      doubleCol: "double",
    },
  };
}

class StringOnlyObject extends Realm.Object {
  stringCol!: Realm.Types.String;
  static schema = {
    name: "StringOnlyObject",
    properties: {
      stringCol: "string",
    },
  };
}

describe("Notifications", () => {
  let runCount = 0;

  beforeEach(() => (runCount = 0));

  describe("Realm notifications", () => {
    openRealmBeforeEach({ schema: [TestObject] });

    /**
     * TODO: only "change" event is being tested, not "schema".
     */
    it("should fire on change", function (this: RealmContext, done) {
      this.realm.addListener("change", (_, event) => {
        expect(event).equals("change");
        done();
      });

      this.realm.write(() => {
        this.realm.create("TestObject", { doubleCol: 42 });
      });
    });

    it("should fire on multiple changes", function (this: RealmContext, done) {
      this.realm.addListener("change", (_, event) => {
        expect(event).equals("change");
        runCount++;
        if (runCount >= 2) {
          done();
        }
      });

      this.realm.write(() => {
        this.realm.create("TestObject", { doubleCol: 1 });
      });

      this.realm.write(() => {
        this.realm.create("TestObject", { doubleCol: 2 });
        this.realm.create("TestObject", { doubleCol: 3 });
      });
    });

    it("implements removeListener", function (this: RealmContext, done) {
      const handler = () => {
        runCount++;
        if (runCount === 1) {
          this.realm.removeListener("change", handler);

          // This listener should be the only one that is fired.
          this.realm.addListener("change", () => done());

          this.realm.write(() => {
            this.realm.create("TestObject", { doubleCol: 2 });
          });
        } else if (runCount >= 2) {
          // On the second (unexpected) run, this handler will call done.
          // If removeListener does not work correctly then it will lead to done
          // being called twice as a result which will cause the test to fail.
          done(new Error("Listener ran too many times"));
        }
      };

      this.realm.addListener("change", handler);

      this.realm.write(() => {
        this.realm.create("TestObject", { doubleCol: 1 });
      });
    });

    it("implements removeAllListeners", function (this: RealmContext, done) {
      const handler = () => {
        runCount++;
        if (runCount >= 2) {
          // On the second (unexpected) run, this handler will call done.
          // If removeAllListeners does not work correctly then it will lead to done
          // being called twice as a result which will cause the test to fail.
          done(new Error("Listener ran too many times"));
        }
      };

      const secondHandler = () => {
        runCount++;
        if (runCount == 2) {
          this.realm.removeAllListeners("change");

          // This listener should be the only one that is fired.
          this.realm.addListener("change", () => done());

          this.realm.write(() => {
            this.realm.create("TestObject", { doubleCol: 2 });
          });
        } else if (runCount >= 3) {
          done(new Error("Listener ran too many times"));
        }
      };

      this.realm.addListener("change", handler);
      this.realm.addListener("change", secondHandler);

      this.realm.write(() => {
        this.realm.create("TestObject", { doubleCol: 1 });
      });
    });
  });

  /**
   * Helper function to use as a generic handler for collection listeners.
   * @param onEnd Callback to run once the listener reaches the end of the changes array. If the callback is Mocha.Done, it will ensure that
   * the listener was run exactly [changesOnRun.length] times
   * @param changesOnRun An array of Realm.CollectionChangeSet.
   * The handler will assert equality of listener's changes with the next element of the array on every run.
   */
  const expectCollectionChangesOnEveryRun = (
    onEnd: () => void | Mocha.Done,
    changesOnRun: Realm.CollectionChangeSet[],
  ) => {
    return (_: Realm.Collection<Realm.Object>, changes: Realm.CollectionChangeSet) => {
      runCount++;

      expect(changes.insertions).deep.equals(changesOnRun[runCount - 1].insertions);
      expect(changes.oldModifications).deep.equals(changesOnRun[runCount - 1].oldModifications);
      expect(changes.newModifications).deep.equals(changesOnRun[runCount - 1].newModifications);
      expect(changes.deletions).deep.equals(changesOnRun[runCount - 1].deletions);

      if (runCount >= changesOnRun.length) {
        // Once runCount reaches given array, run the onEnd callback. If onEnd is Mocha.done then
        // running it multiple times will cause tests to fail so this also ensures the listener fires
        // exactly changesOnRun.length times.
        onEnd();
      }
    };
  };

  describe("Results notifications", () => {
    let testObjects: Realm.Collection<TestObject>;

    openRealmBeforeEach({ schema: [TestObject] });

    beforeEach(function (this: RealmContext) {
      testObjects = this.realm.objects(TestObject);
    });

    it("should fire on insertion", function (this: RealmContext, done) {
      testObjects.addListener(
        expectCollectionChangesOnEveryRun(done, [
          { insertions: [], newModifications: [], oldModifications: [], deletions: [] },
          { insertions: [0, 1], newModifications: [], oldModifications: [], deletions: [] },
        ]),
      );

      this.realm.write(() => {
        this.realm.create("TestObject", { doubleCol: 1 });
        this.realm.create("TestObject", { doubleCol: 2 });
      });
    });

    it("should fire on update", function (this: RealmContext, done) {
      testObjects.addListener(
        expectCollectionChangesOnEveryRun(done, [
          { insertions: [], newModifications: [], oldModifications: [], deletions: [] },
          { insertions: [0, 1, 2], newModifications: [], oldModifications: [], deletions: [] },
          { insertions: [], newModifications: [0], oldModifications: [0], deletions: [] },
          { insertions: [], newModifications: [0, 1], oldModifications: [0, 2], deletions: [1] },
        ]),
      );

      this.realm.write(() => {
        this.realm.create("TestObject", { doubleCol: 1 });
        this.realm.create("TestObject", { doubleCol: 2 });
        this.realm.create("TestObject", { doubleCol: 3 });
      });

      this.realm.write(() => {
        testObjects[0].doubleCol = 15;
      });

      this.realm.write(() => {
        testObjects[0].doubleCol = 10;
        testObjects[2].doubleCol = 30;
        this.realm.delete(testObjects[1]);
      });
    });

    it("should fire on deletion", function (this: RealmContext, done) {
      testObjects.addListener(
        expectCollectionChangesOnEveryRun(done, [
          { insertions: [], newModifications: [], oldModifications: [], deletions: [] },
          { insertions: [0, 1, 2, 3], newModifications: [], oldModifications: [], deletions: [] },
          { insertions: [], newModifications: [], oldModifications: [], deletions: [0, 2] },
        ]),
      );

      this.realm.write(() => {
        this.realm.create("TestObject", { doubleCol: 1 });
        this.realm.create("TestObject", { doubleCol: 2 });
        this.realm.create("TestObject", { doubleCol: 3 });
        this.realm.create("TestObject", { doubleCol: 4 });
      });

      this.realm.write(() => {
        this.realm.delete(testObjects[2]);
        this.realm.delete(testObjects[0]);
      });
    });

    it("implements removeListener", function (this: RealmContext) {
      const throwErrorOnEnd = () => {
        throw new Error("should not run after removeListener");
      };
      const handler = expectCollectionChangesOnEveryRun(throwErrorOnEnd, [
        { insertions: [], newModifications: [], oldModifications: [], deletions: [] },
        { insertions: [0, 1], newModifications: [], oldModifications: [], deletions: [] },
      ]);

      testObjects.addListener(handler);

      this.realm.write(() => {
        this.realm.create("TestObject", { doubleCol: 1 });
        this.realm.create("TestObject", { doubleCol: 2 });
      });

      testObjects.removeListener(handler);

      this.realm.write(() => {
        this.realm.create("TestObject", { doubleCol: 1 });
        this.realm.create("TestObject", { doubleCol: 2 });
      });

      expect(runCount).equals(1);
    });

    it("implements removeAllListeners", function (this: RealmContext) {
      const throwErrorOnEnd = () => {
        throw new Error("should not run after removeAllListeners");
      };

      testObjects.addListener(
        expectCollectionChangesOnEveryRun(throwErrorOnEnd, [
          { insertions: [], newModifications: [], oldModifications: [], deletions: [] },
          { insertions: [0, 1], newModifications: [], oldModifications: [], deletions: [] },
        ]),
      );

      this.realm.write(() => {
        this.realm.create("TestObject", { doubleCol: 1 });
        this.realm.create("TestObject", { doubleCol: 2 });
      });

      // Add another listener that should not run after initialization.
      testObjects.addListener(
        expectCollectionChangesOnEveryRun(throwErrorOnEnd, [
          { insertions: [], newModifications: [], oldModifications: [], deletions: [] },
        ]),
      );

      testObjects.removeAllListeners();

      this.realm.write(() => {
        this.realm.create("TestObject", { doubleCol: 1 });
        this.realm.create("TestObject", { doubleCol: 2 });
      });

      expect(runCount).equals(1);
    });

    it("should handle removeAllListeners correctly", function (this: RealmContext, done) {
      const testObjects = this.realm.objects(TestObject);

      testObjects.addListener(
        expectCollectionChangesOnEveryRun(done, [
          { insertions: [], newModifications: [], oldModifications: [], deletions: [] },
          { insertions: [0], newModifications: [], oldModifications: [], deletions: [] },
        ]),
      );

      // Attempt to remove all listeners but because the listener added above
      // is bound to a specific collection, it should not be removed
      this.realm.objects(TestObject).removeAllListeners();

      this.realm.write(() => {
        this.realm.create(TestObject, { doubleCol: 1 });
      });
    });
  });

  describe("List notifications", () => {
    let testObjectList: Realm.List<TestObject>;

    openRealmBeforeEach({ schema: [TestObject, ListObject] });

    beforeEach(function (this: RealmContext) {
      testObjectList = this.realm.write(() => new ListObject(this.realm, { list: [] }).list);
    });

    it("should fire on insertion", function (this: RealmContext, done) {
      testObjectList.addListener(
        expectCollectionChangesOnEveryRun(done, [
          { insertions: [], newModifications: [], oldModifications: [], deletions: [] },
          { insertions: [0, 1], newModifications: [], oldModifications: [], deletions: [] },
        ]),
      );

      this.realm.write(() => {
        testObjectList.push(new TestObject(this.realm, { doubleCol: 1 }));
        testObjectList.push(new TestObject(this.realm, { doubleCol: 2 }));
      });
    });

    it("should fire on update", function (this: RealmContext, done) {
      testObjectList.addListener(
        expectCollectionChangesOnEveryRun(done, [
          { insertions: [], newModifications: [], oldModifications: [], deletions: [] },
          { insertions: [0, 1, 2], newModifications: [], oldModifications: [], deletions: [] },
          { insertions: [], newModifications: [0, 2], oldModifications: [0, 2], deletions: [] },
        ]),
      );

      this.realm.write(() => {
        testObjectList.push(new TestObject(this.realm, { doubleCol: 1 }));
        testObjectList.push(new TestObject(this.realm, { doubleCol: 2 }));
        testObjectList.push(new TestObject(this.realm, { doubleCol: 3 }));
      });

      this.realm.write(() => {
        testObjectList[2].doubleCol = 30;
        testObjectList[0].doubleCol = 30;
      });
    });

    it("should fire on splice", function (this: RealmContext, done) {
      testObjectList.addListener(
        expectCollectionChangesOnEveryRun(done, [
          { insertions: [], newModifications: [], oldModifications: [], deletions: [] },
          { insertions: [0, 1, 2], newModifications: [], oldModifications: [], deletions: [] },
          { insertions: [], newModifications: [], oldModifications: [], deletions: [0, 2] },
        ]),
      );

      this.realm.write(() => {
        testObjectList.push(new TestObject(this.realm, { doubleCol: 1 }));
        testObjectList.push(new TestObject(this.realm, { doubleCol: 2 }));
        testObjectList.push(new TestObject(this.realm, { doubleCol: 3 }));
      });

      this.realm.write(() => {
        testObjectList.splice(2, 1);
        testObjectList.splice(0, 1);
      });
    });

    it("implements removeListener", function (this: RealmContext) {
      const throwErrorOnEnd = () => {
        throw new Error("should not run after removeListener");
      };
      const handler = expectCollectionChangesOnEveryRun(throwErrorOnEnd, [
        { insertions: [], newModifications: [], oldModifications: [], deletions: [] },
        { insertions: [0, 1], newModifications: [], oldModifications: [], deletions: [] },
      ]);

      testObjectList.addListener(handler);

      this.realm.write(() => {
        testObjectList.push(new TestObject(this.realm, { doubleCol: 1 }));
        testObjectList.push(new TestObject(this.realm, { doubleCol: 2 }));
      });

      testObjectList.removeListener(handler);

      this.realm.write(() => {
        testObjectList.push(new TestObject(this.realm, { doubleCol: 1 }));
        testObjectList.push(new TestObject(this.realm, { doubleCol: 2 }));
      });

      expect(runCount).equals(1);
    });

    it("implements removeAllListeners", function (this: RealmContext) {
      const throwErrorOnEnd = () => {
        throw new Error("should not run after removeAllListeners");
      };

      testObjectList.addListener(
        expectCollectionChangesOnEveryRun(throwErrorOnEnd, [
          { insertions: [], newModifications: [], oldModifications: [], deletions: [] },
          { insertions: [0, 1], newModifications: [], oldModifications: [], deletions: [] },
        ]),
      );

      this.realm.write(() => {
        testObjectList.push(new TestObject(this.realm, { doubleCol: 1 }));
        testObjectList.push(new TestObject(this.realm, { doubleCol: 2 }));
      });

      // Add another listener that should not run after initialization.
      testObjectList.addListener(
        expectCollectionChangesOnEveryRun(throwErrorOnEnd, [
          { insertions: [], newModifications: [], oldModifications: [], deletions: [] },
        ]),
      );

      testObjectList.removeAllListeners();

      this.realm.write(() => {
        testObjectList.push(new TestObject(this.realm, { doubleCol: 1 }));
        testObjectList.push(new TestObject(this.realm, { doubleCol: 2 }));
      });

      expect(runCount).equals(1);
    });
  });
  describe("Object notifications", () => {
    openRealmBeforeEach({ schema: [StringOnlyObject] });
    it("fires correct changeset", async function (this: Mocha.Context & RealmContext) {
      let calls = 0;
      let resolve: any;
      let reject: any;

      let promise = new Promise((res, rej) => {
        (resolve = res), (reject = rej);
      });
      const obj = this.realm.write(() => {
        return this.realm.create<StringOnlyObject>(StringOnlyObject.schema.name, { stringCol: "foo" });
      });

      obj.addListener((obj: StringOnlyObject, changes) => {
        try {
          calls++;
          switch (calls) {
            case 1:
              break;
            case 2:
              expect(changes.deleted).to.be.false;
              expect(changes.changedProperties.length).equals(1);
              expect(changes.changedProperties[0]).equals("stringCol");
              expect(obj["stringCol"]).equals("bar");
              break;
            case 3:
              expect(changes.deleted).to.be.true;
              expect(changes.changedProperties.length).equals(0);
              this.realm.close();
          }
          resolve();
        } catch (e) {
          reject(e);
        }
      });
      await promise;

      promise = new Promise((res, rej) => {
        (resolve = res), (reject = rej);
      });
      this.realm.write(() => {
        obj["stringCol"] = "bar";
      });
      await promise;

      promise = new Promise((res, rej) => {
        (resolve = res), (reject = rej);
      });
      this.realm.write(() => {
        this.realm.delete(obj);
      });
      await promise;
    });

    it("implements remove listeners", function (this: Mocha.Context & RealmContext, done) {
      const obj = this.realm.write(() => {
        return this.realm.create<StringOnlyObject>(StringOnlyObject.schema.name, { stringCol: "foo" });
      });

      let calls = 0;

      const listener = (object: StringOnlyObject) => {
        calls++;
        if (calls === 1) {
          expect(object["stringCol"]).equals("foo");
          this.realm.write(() => {
            obj["stringCol"] = "bar";
          });
        } else if (calls === 2) {
          expect(object["stringCol"]).equals("bar");
          obj.removeListener(listener);
          let isFirstRun = true;
          obj.addListener(() => {
            if (isFirstRun) {
              isFirstRun = false;
            } else {
              expect(this.realm.objects<StringOnlyObject>(StringOnlyObject.schema.name)[0]["stringCol"]).equals(
                "foobar",
              );
              done();
            }
          });
          this.realm.write(function () {
            obj["stringCol"] = "foobar";
          });
        } else {
          done(new Error("Listener ran too many times"));
        }
      };
      obj.addListener(listener);
    });

    it("implements removeAllListeners", function (this: Mocha.Context & RealmContext, done) {
      const obj = this.realm.write(() => {
        return this.realm.create<StringOnlyObject>(StringOnlyObject.schema.name, { stringCol: "foo" });
      });

      let calls = 0;

      const listener = (object: StringOnlyObject) => {
        calls++;
        if (calls === 2) {
          expect(object["stringCol"]).equals("bar");
          obj.removeAllListeners();
          let isFirstRun = true;
          obj.addListener(() => {
            if (isFirstRun) {
              isFirstRun = false;
            } else {
              expect(this.realm.objects<StringOnlyObject>(StringOnlyObject.schema.name)[0]["stringCol"]).equals(
                "foobar",
              );
              expect(calls).equals(2); // Listener only called twice
              done();
            }
          });
          this.realm.write(function () {
            obj["stringCol"] = "foobar";
          });
        }
      };

      obj.addListener(listener);

      this.realm.write(function () {
        obj["stringCol"] = "bar";
      });
    });
  });
});
