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

import { expect } from "chai";
import Realm from "realm";

type ObjectA = {
  otherName: string;
  age?: number;
};

function getRealm() {
  const schemas = [
    {
      name: "ObjectA",
      properties: {
        otherName: { type: "string", mapTo: "name" },
        age: { type: "int", optional: true },
      },
    },
  ];

  return new Realm({
    schema: schemas,
  });
}

function addTestObjects(realm: Realm) {
  realm.beginTransaction();
  realm.create("ObjectA", {
    otherName: "Foo",
    age: 41,
  });
  realm.create("ObjectA", {
    otherName: "Bar",
    age: 42,
  });
  realm.commitTransaction();
}

describe("Realm Alias", () => {
  beforeEach(() => {
    Realm.clearTestState();
  });

  it("supports remapping property names using mapTo", () => {
    const Person: Realm.ObjectSchema = {
      name: "Person",
      properties: {
        _name: { type: "string", mapTo: "name" },
        address: { type: "string", indexed: true },
        age: "double",
        _married: { type: "bool", default: false, mapTo: "married" },
        _children: { type: "list", objectType: "Person", mapTo: "children" },
        _parents: { type: "linkingObjects", objectType: "Person", property: "children", mapTo: "parents" },
      },
    };

    const realm = new Realm({
      schema: [Person],
    });

    // Mapped properties are reported for all variants, no matter if the public_name is set or not.
    const props = realm.schema[0].properties;
    expect(props["_name"].mapTo).equals("name");
    expect(props["address"].mapTo).equals("address");
    expect(props["age"].mapTo).equals("age");
    expect(props["_married"].mapTo).equals("married");
    expect(props["_children"].mapTo).equals("children");
    expect(props["_parents"].mapTo).equals("parents");
  });
  it("is used when creating objects", () => {
    const realm = getRealm();
    realm.beginTransaction();

    // Creating objects most use the alias
    realm.create("ObjectA", {
      otherName: "Foo",
      age: 42,
    });

    // Creating uses arrays still work
    realm.create("ObjectA", ["Bar", 42]);

    // Using the internal name instead of the alias throws an exception.
    expect(() => realm.create("ObjectA", { name: "Boom" })).to.throw();

    realm.commitTransaction();

    realm.close();
  });
  it("is used when updating objects", () => {
    const realm = getRealm();
    realm.beginTransaction();

    const obj = realm.create<ObjectA>("ObjectA", { otherName: "Foo" });

    // Setting properties must use alias
    obj.otherName = "Bar";
    expect(obj.otherName).equals("Bar");

    // If no alias is defined, the internal name still works
    obj.age = 1;
    expect(obj.age).equals(1);

    // Even if a mapped name is set, only the public name can be used when updating properties.
    // @ts-expect-error This isn't a field usable for this schema
    obj.name = "Baz";
    expect(obj.otherName).equals("Bar");

    realm.commitTransaction();

    realm.close();
  });
  it("is used when reading properties", () => {
    const realm = getRealm();
    addTestObjects(realm);

    // The mapped property names cannot be used when reading properties
    const obj = realm.objects<ObjectA>("ObjectA")[0];
    // @ts-expect-error This should be undefined
    expect(obj.name).equals(undefined);
    expect(obj.otherName).equals("Foo");
    expect(obj.age).equals(41);

    // Only the Javascript property names are visible as keys, not the mapped names.
    for (const key in obj) {
      expect(key).not.equals("name");
    }

    realm.close();
  });
  it("is used in queries", () => {
    const realm = getRealm();
    addTestObjects(realm);

    // Queries also use aliases
    let results = realm.objects<ObjectA>("ObjectA").filtered("otherName = 'Foo'");
    expect(results.length).equals(1);

    // Querying on internal names are still allowed
    results = realm.objects<ObjectA>("ObjectA").filtered("name = 'Foo'");
    expect(results.length).equals(1);

    realm.close();
  });
});
