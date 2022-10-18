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

import Realm from "realm";
import { openRealmBeforeEach } from "../hooks";

import { PersonSchema, DogSchema } from "../schemas/person-and-dogs";

describe("Realm Listeners", () => {
  beforeEach(() => {
    Realm.clearTestState();
  });
  openRealmBeforeEach({ inMemory: true, schema: [PersonSchema, DogSchema] });
  it("should work for changes", function (this: RealmContext, done) {
    this.realm.addListener("change", () => {
      done();
    });

    this.realm.write(() => {
      this.realm.create("Person", { age: 3, name: "Bob" });
    });
  });
  it("should work for beforenotify", function (this: RealmContext, done) {
    // Fires once when listener gets added
    this.realm.addListener("beforenotify", () => {
      done();
    });
  });
  it("work for schema changes", function (this: RealmContext, done) {
    this.realm.addListener("schema", () => {
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
    let firstListenerRuns = 0;
    let secondListenerRuns = 0;
    this.realm.addListener("change", () => {
      firstListenerRuns += 1;
    });
    this.realm.addListener("schema", () => {
      secondListenerRuns += 1;
    });
    this.realm.addListener("change", () => {
      if (firstListenerRuns === 1 && secondListenerRuns === 1) {
        // After first write, continue (schema changes will call "change" listeners as well).
        return;
      } else if (firstListenerRuns === 2 && secondListenerRuns === 1) {
        // After both write, this should be expected state.
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
