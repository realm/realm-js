////////////////////////////////////////////////////////////////////////////
//
// Copyright 2019 Realm Inc.
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

/* eslint-env es6, node */

const { Realm } = require("realm");
var TestCase = require("./asserts");
var schemas = require("./schemas");

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

function addTestObjects(realm) {
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

module.exports = {
  testAliasInSchema() {
    const Person = {
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
    TestCase.assertEqual(props["_name"].mapTo, "name");
    TestCase.assertEqual(props["address"].mapTo, "address");
    TestCase.assertEqual(props["age"].mapTo, "age");
    TestCase.assertEqual(props["_married"].mapTo, "married");
    TestCase.assertEqual(props["_children"].mapTo, "children");
    TestCase.assertEqual(props["_parents"].mapTo, "parents");

    realm.close();
  },

  testAliasWhenCreatingObjects() {
    const realm = getRealm();
    realm.beginTransaction();

    // Creating objects must use the alias
    realm.create("ObjectA", {
      otherName: "Foo",
      age: 42,
    });

    // Creating uses arrays still work
    realm.create("ObjectA", ["Bar", 42]);

    // Using the internal name instead of the alias throws an exception.
    TestCase.assertThrows(() => realm.create("ObjectA", { name: "Boom" }));

    realm.commitTransaction();

    realm.close();
  },

  testAliasWhenUpdatingObjects() {
    const realm = getRealm();
    realm.beginTransaction();

    let obj = realm.create("ObjectA", { otherName: "Foo" });

    // Setting properties must use alias
    obj.otherName = "Bar";
    TestCase.assertEqual(obj.otherName, "Bar");

    // If no alias is defined, the internal name still works
    obj.age = 1;
    TestCase.assertEqual(obj.age, 1);

    // Even if a mapped name is set, only the public name can be used when updating properties.
    obj.name = "Baz";
    TestCase.assertEqual(obj.otherName, "Bar");

    realm.commitTransaction();

    realm.close();
  },

  testAliasWhenReadingProperties() {
    const realm = getRealm();
    addTestObjects(realm);

    // The mapped property names cannot be used when reading properties
    let obj = realm.objects("ObjectA")[0];
    TestCase.assertEqual(obj.name, undefined);
    TestCase.assertEqual(obj.otherName, "Foo");
    TestCase.assertEqual(obj.age, 41);

    // Only the Javascript property names are visible as keys, not the mapped names.
    for (var key in obj) {
      TestCase.assertFalse(key === "name");
    }

    realm.close();
  },

  testAliasInQueries() {
    const realm = getRealm();
    addTestObjects(realm);

    // Queries also use aliases
    let results = realm.objects("ObjectA").filtered("otherName = 'Foo'");
    TestCase.assertEqual(results.length, 1);

    // Querying on internal names are still allowed
    results = realm.objects("ObjectA").filtered("name = 'Foo'");
    TestCase.assertEqual(results.length, 1);

    realm.close();
  },
};
