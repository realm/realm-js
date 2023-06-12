////////////////////////////////////////////////////////////////////////////
//
// Copyright 2020 Realm Inc.
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

import { PersonSchema, DogSchema } from "../schemas/person-and-dogs";

describe("Realm Listeners", () => {
  beforeEach(() => {
    Realm.clearTestState();
  });
  openRealmBeforeEach({ inMemory: true, schema: [PersonSchema, DogSchema] });

  describe("addListener", () => {
    it("should work for change", function (this: RealmContext, done) {
      this.realm.addListener("change", (realm, name, schema) => {
        expect(name).to.equal("change");
        expect(realm).to.equal(this.realm);
        expect(schema).to.equal(undefined);
        done();
      });

      this.realm.write(() => {
        this.realm.create("Person", { age: 3, name: "Bob" });
      });
    });
    // TODO: Figure out why the event is fired twice on React Native
    it.skipIf(environment.reactNative, "should work for beforenotify", function (this: RealmContext, done) {
      const callback = (realm: Realm, name: string, schema: undefined) => {
        expect(name).to.equal("beforenotify");
        expect(realm).to.equal(this.realm);
        expect(schema).to.equal(undefined);
        // Removing the comment from the following line will make the test pass,
        // but we don't currently know why its fireing twice on React Native only.
        // this.realm.removeListener("beforenotify", callback);
        done();
      };
      this.realm.addListener("beforenotify", callback);
      this.realm.write(() => {
        this.realm.create("Person", { age: 3, name: "Bob" });
      });
    });
    it("should work for schema", function (this: RealmContext, done) {
      this.realm.addListener("schema", (realm, name, schema) => {
        expect(name).to.equal("schema");
        expect(realm).to.equal(this.realm);
        expect(schema).to.deep.equal(this.realm.schema);
        done();
      });

      this.realm.write(() => {
        this.realm._updateSchema([...this.realm.schema, { name: "MyClass", properties: { myField: "string" } }]);
      });
    });
    it("should not call change and schema for no reason", function (this: RealmContext, done) {
      this.realm.addListener("change", () => {
        done("should not run");
      });
      this.realm.addListener("schema", () => {
        done("should not run");
      });
      done();
    });
    it("should work with multiple listeners of same type", function (this: RealmContext, done) {
      let firstListenerRuns = 0;
      let secondListenerRuns = 0;
      this.realm.addListener("change", () => {
        firstListenerRuns += 1;
      });
      this.realm.addListener("change", () => {
        secondListenerRuns += 1;
      });
      this.realm.addListener("change", () => {
        if (firstListenerRuns === 1 && secondListenerRuns === 1) {
          // After first write, continue
          return;
        } else if (firstListenerRuns === 2 && secondListenerRuns === 2) {
          // After both write, this should be expected state.
          done();
        } else {
          done(Error("did not run other listeners correctly"));
        }
      });
      this.realm.write(() => {
        this.realm.create("Person", { age: 3, name: "Bob" });
      });
      this.realm.write(() => {
        this.realm.create("Person", { age: 3, name: "Tom" });
      });
    });
    it("should work with multiple listeners of different types", function (this: RealmContext, done) {
      let changeListenerRuns = 0;
      let schemaListenerRuns = 0;
      this.realm.addListener("change", () => {
        changeListenerRuns += 1;
      });
      this.realm.addListener("schema", () => {
        schemaListenerRuns += 1;
      });
      this.realm.addListener("change", () => {
        if (changeListenerRuns === 1 && schemaListenerRuns === 1) {
          // After schema change, continue (schema changes will call "change" listener as well).
          return;
        } else if (changeListenerRuns === 2 && schemaListenerRuns === 1) {
          // After both writes, this should be expected state.
          done();
        } else {
          done(Error("did not run other listeners correctly"));
        }
      });
      this.realm.write(() => {
        this.realm._updateSchema([...this.realm.schema, { name: "MyClass", properties: { myField: "string" } }]);
      });
      this.realm.write(() => {
        this.realm.create("Person", { age: 3, name: "Bob" });
      });
    });
  });
  describe("removeListener", () => {
    it("should not fire removed listener", function (this: RealmContext, done) {
      const test = () => {
        // done will error if ran more than once
        done();
      };
      this.realm.addListener("change", test);

      this.realm.write(() => {
        this.realm.create("Person", { age: 3, name: "Bob" });
      });
      this.realm.removeListener("change", test);
      this.realm.write(() => {
        this.realm.create("Person", { age: 3, name: "Tom" });
      });
    });
  });
  describe("removeAllListeners", () => {
    it("should not fire removed listeners", function (this: RealmContext, done) {
      const test = () => {
        // done will error if ran more than once
        done();
      };
      this.realm.addListener("change", test);
      this.realm.addListener("schema", test);

      this.realm.write(() => {
        this.realm.create("Person", { age: 3, name: "Tom" });
      });

      this.realm.removeAllListeners();
      this.realm.write(() => {
        this.realm.create("Person", { age: 3, name: "Tom" });
      });
      this.realm.write(() => {
        this.realm._updateSchema([...this.realm.schema, { name: "MyClass", properties: { myField: "string" } }]);
      });
    });
  });
});
