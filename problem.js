////////////////////////////////////////////////////////////////////////////
//
// Copyright 2022 Realm Inc.
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
const Realm = require(".");

const p1 = new Proxy([{}], {
  get(target, key) {
    return Reflect.get(target, key);
  },
});

console.log("p1: ", Object.prototype.toString.call(p1));

const p2 = new Proxy(
  {},
  {
    get(target, key) {
      console.log("test", Reflect.get(target, key));
      return Reflect.get(target, key);
    },
  },
);

console.log("p2: ", Object.prototype.toString.call(p2));

const realm = new Realm({
  schema: [{ name: "Person", properties: { name: "string" } }],
  deleteRealmIfMigrationNeeded: true,
});
const persons = realm.objects("Person");
const Results = Object.getPrototypeOf(persons);

const item = realm.write(() => {
  return realm.create("Person", { name: "tom" });
});

console.log("non proxy realm: ", Object.prototype.toString.call(persons));

const p3 = new Proxy(persons, {
  get(target, key) {
    return Reflect.get(target, key);
    //return "string ";
    // console.log("Get called on", key);
    // const value = Reflect.get(target, key);
    // if (typeof value === "function") {
    //   return value.bind(target);
    // } else {
    //   console.log(Object.prototype.toString.call(target));
    //   console.log(value);
    //   return Object.prototype.toString.call(target);
    // }
  },
});

console.log("p3: ", Object.prototype.toString.call(p3));

/*

console.log("First print:", p);

Object.defineProperty(Results, Symbol.toStringTag, {
  value: "Result",
});

console.log("Second print:", p);
*/
