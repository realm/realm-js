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

const { Realm } = require("realm");
let TestCase = require("./asserts");
let { Decimal128, ObjectId, UUID } = require("bson");

const DictSchema = {
  name: "Dictionary",
  properties: {
    a: "{}",
  },
};

module.exports = {
  testDictionarySchema() {
    // Test that short (JS) and canonical schema types yield
    // the same results
    const childSchema = {
      name: "Child",
      properties: {
        value: "int",
      },
    };

    const shorthandSchema = {
      name: "ShorthandSchema",
      properties: {
        a: "string{}",
        b: "{}",
        c: "Child{}",
      },
    };

    const canonicalSchema = {
      name: "CanonicalSchema",
      properties: {
        a: { type: "dictionary", objectType: "string", optional: false },
        b: { type: "dictionary", objectType: "mixed", optional: true },
        c: { type: "dictionary", objectType: "Child", optional: true },
      },
    };

    const canonicalRealm = new Realm({ schema: [canonicalSchema, childSchema] });
    const canSchema = canonicalRealm.schema;
    canonicalRealm.close();

    const shorthandRealm = new Realm({ schema: [shorthandSchema, childSchema] });
    const shSchema = shorthandRealm.schema;
    shorthandRealm.close();

    TestCase.assertEqual(
      shSchema.properties,
      canSchema.properties,
      "Canonical and shorthand schemas should have identical properties",
    );
  },

  testDictionaryCreate() {
    //Shouldn't throw
    let realm = new Realm({ schema: [DictSchema] });
    realm.write(() => realm.create(DictSchema.name, { a: { x: 1, y: 2, z: "hey" } }));
    let data = realm.objects(DictSchema.name)[0];

    // FIXME: https://github.com/realm/realm-js/issues/3836
    // TestCase.assertTrue(data.a instanceof(Realm.Dictionary), "Should be a dictionary");

    TestCase.assertTrue(data.a.addListener !== undefined, "addListener should be an method of Dictionary");
    TestCase.assertTrue(
      data.a.removeAllListeners !== undefined,
      "removeAllListeners should be an method of Dictionary",
    );
    TestCase.assertTrue(data.a.removeListener !== undefined, "removeListener should be an method of Dictionary");
    TestCase.assertTrue(data.a.set !== undefined, "set should be an method of Dictionary");

    realm.close();
  },

  testDictionaryAddingObject() {
    let realm = new Realm({ schema: [DictSchema] });
    realm.write(() => realm.create(DictSchema.name, { a: { x: 1, y: 2, z: "hey" } }));

    let data = realm.objects(DictSchema.name)[0];

    TestCase.assertEqual(typeof data.a, "object", "Should be an object");

    TestCase.assertEqual(data.a.x, 1, "Should be an equals to a.x = 1");
    TestCase.assertEqual(data.a.y, 2, "Should be an equals to a.y = 2");
    TestCase.assertEqual(data.a.z, "hey", "Should be an equals to a.z = hey");

    let o = Object.keys(data.a);
    o.forEach((k) => {
      TestCase.assertNotEqual(["x", "y", "z"].indexOf(k), -1, "Should contain all the keys");
    });

    realm.close();
  },

  testDictionaryUpdating() {
    //Shouldn't throw
    let realm = new Realm({ schema: [DictSchema] });
    realm.write(() => realm.create(DictSchema.name, { a: { x: 1, y: 2, z: "hey" } }));

    let data = realm.objects(DictSchema.name)[0];
    TestCase.assertEqual(typeof data.a, "object", "Should be an object");
    TestCase.assertEqual(data.a.x, 1, "Should be an equals to a.x = 1");
    TestCase.assertEqual(data.a.y, 2, "Should be an equals to a.y = 2");
    TestCase.assertEqual(data.a.z, "hey", "Should be an equals to a.z = hey");

    realm.write(() => (data.a = { x: 0, y: 0, z: -1, m: "new-field" }));

    TestCase.assertEqual(typeof data.a, "object", "Should be an object");
    TestCase.assertEqual(data.a.x, 0, "Should be an equals to a.x = 0");
    TestCase.assertEqual(data.a.y, 0, "Should be an equals to a.y = 0");
    TestCase.assertEqual(data.a.z, -1, "Should be an equals to a.z = -1");
    TestCase.assertEqual(
      data.a.m,
      "new-field",
      'Should be a new field called m and it should be equals to "new-field"',
    );

    realm.write(() => {
      data.a.x = 1;
    });
    TestCase.assertEqual(data.a.x, 1, "Should be an equals to a.x = 1");

    realm.write(() => (data.a = { p: 1 }));
    TestCase.assertEqual(typeof data.a.x, "undefined", "Should be deleted.");
    TestCase.assertEqual(typeof data.a.y, "undefined", "Should be deleted.");
    TestCase.assertEqual(typeof data.a.z, "undefined", "Should be deleted.");
    TestCase.assertEqual(data.a.p, 1, "p is 1");

    realm.close();
  },

  testDictionaryWithTypedValues() {
    const DictIntSchema = {
      name: "Dictionary",
      properties: {
        a: "int{}",
      },
    };
    let realm = new Realm({ schema: [DictIntSchema] });
    realm.write(() => realm.create(DictIntSchema.name, { a: { x: 1, y: 2, z: 4 } }));
    let data = realm.objects(DictIntSchema.name)[0];
    TestCase.assertEqual(data.a.x, 1, "Should be an equals to a.x = 1");
    TestCase.assertEqual(data.a.y, 2, "Should be an equals to a.y = 2");
    TestCase.assertEqual(data.a.z, 4, "Should be an equals to a.z = 4");

    TestCase.assertThrowsContaining(
      () => realm.write(() => realm.create(DictIntSchema.name, { a: { c: "error" } })),
      "Property must be of type 'number', got (error)",
    );
    TestCase.assertThrowsContaining(
      () => realm.write(() => (data.a = "cc")),
      "Dictionary.a must be of type 'number{}', got 'string' ('cc')",
    );

    realm.close();
  },

  testDictionaryHandlingSchemaParsingError() {
    const DictWrongSchema = {
      name: "Dictionary",
      properties: {
        a: "wwwww{}",
      },
    };
    TestCase.assertThrowsContaining(() => {
      new Realm({ schema: [DictWrongSchema] });
    }, "Schema validation failed due to the following errors:\n- Property 'Dictionary.a' of type 'dictionary' has unknown object type 'wwwww'");
  },

  testDictionaryMutability() {
    //Shouldn't throw
    let realm = new Realm({ schema: [DictSchema] });
    realm.write(() => realm.create(DictSchema.name, { a: { x: 1, y: 2, z: 3 } }));

    let data = realm.objects(DictSchema.name)[0].a;
    let mutable = realm.objects(DictSchema.name)[0].a;

    TestCase.assertEqual(typeof data, "object", "Should be an object");
    TestCase.assertEqual(data.x, 1, "Should be an equals to a.x = 1");
    TestCase.assertEqual(data.y, 2, "Should be an equals to a.y = 2");
    TestCase.assertEqual(data.z, 3, "Should be an equals to a.z = 3");

    TestCase.assertEqual(typeof mutable, "object", "Should be an object");
    TestCase.assertEqual(mutable.x, 1, "Should be an equals to mutable.x = 1");
    TestCase.assertEqual(mutable.y, 2, "Should be an equals to mutable.y = 2");
    TestCase.assertEqual(mutable.z, 3, "Should be an equals to mutable.z = 3");

    realm.write(() => {
      data.x = 3;
      data.y = 2;
      data.z = 1;
    });

    TestCase.assertEqual(typeof data, "object", "Should be an object");
    TestCase.assertEqual(data.x, 3, "Should be an equals to a.x = 3");
    TestCase.assertEqual(data.y, 2, "Should be an equals to a.y = 2");
    TestCase.assertEqual(data.z, 1, "Should be an equals to a.z = 1");

    TestCase.assertEqual(typeof mutable, "object", "Should be an object");
    TestCase.assertEqual(mutable.x, 3, "Should be an equals to mutable.x = 3");
    TestCase.assertEqual(mutable.y, 2, "Should be an equals to mutable.y = 2");
    TestCase.assertEqual(mutable.z, 1, "Should be an equals to mutable.z = 1");

    realm.close();
  },

  testDictionaryDifferentBackend() {
    const DictSchemaRef = {
      name: "Dictionary",
      properties: {
        a: "{}",
        b: "{}",
      },
    };

    //Shouldn't throw
    let realm = new Realm({ schema: [DictSchemaRef] });
    realm.write(() =>
      realm.create(DictSchemaRef.name, { a: { x: 1, y: 2, z: 3 }, b: { name: "Caesar", second: "August" } }),
    );

    let data = realm.objects(DictSchemaRef.name)[0].a;
    let person = realm.objects(DictSchemaRef.name)[0].b;

    TestCase.assertEqual(typeof data, "object", "Should be an object");
    TestCase.assertEqual(data.x, 1, "Should be an equals to a.x = 1");
    TestCase.assertEqual(data.y, 2, "Should be an equals to a.y = 2");
    TestCase.assertEqual(data.z, 3, "Should be an equals to a.z = 3");

    TestCase.assertEqual(typeof person, "object", "Should also being an object");
    TestCase.assertEqual(person.name, "Caesar", "Should be an equals to Caesar");
    TestCase.assertEqual(person.second, "August", "Should be an equals to August");

    realm.close();
  },

  testDictionary_Javascript_Object_Features() {
    const DictSchema = {
      name: "testDictionary_Javascript_Object_Features",
      properties: {
        a: "{}",
      },
    };

    let realm = new Realm({ schema: [DictSchema] });
    realm.write(() => realm.create(DictSchema.name, { a: { x: 1, y: 2, z: 3 } }));
    let point = realm.objects(DictSchema.name)[0].a;

    TestCase.assertEqual(JSON.stringify(point), '{"x":1,"z":3,"y":2}', 'Should be an equals to: {"x":1,"z":3,"y":2}');
    TestCase.assertArraysEqual(Object.values(point), [1, 3, 2], "Should be an equals to: [1,3,2]");
    TestCase.assertArraysEqual(Object.keys(point), ["x", "z", "y"], "Should be an equals to: ['x','z','y']");

    let { x, y, z } = point;
    TestCase.assertEqual(x, 1, "Should be an equals to: [1,3,2]");
    TestCase.assertEqual(y, 2, "Should be an equals to: [1,3,2]");
    TestCase.assertEqual(z, 3, "Should be an equals to: [1,3,2]");

    TestCase.assertEqual(point[Symbol.for("x")], 1, "Should work with symbols");

    realm.close();
  },

  testDictionaryQuery() {
    const DictSchema = {
      name: "Dictionary",
      properties: {
        a: "{}",
      },
    };

    let realm = new Realm({ schema: [DictSchema] });
    const N = 100;
    for (let i = 0; i < N; i++) {
      realm.write(() => realm.create(DictSchema.name, { a: { x: i, y: 2, z: 3 } }));
    }

    let data = realm.objects(DictSchema.name);
    TestCase.assertEqual(data.length, N, `We expect ${N} objects.`);

    let half = data.filtered("a['x'] >= 50");
    let seventy = data.filtered("a['x'] >= $0", 70);
    TestCase.assertEqual(half.length, N / 2, "We expect only 50 items, matching for field x.");
    TestCase.assertEqual(seventy.length, 30, "We expect only 30 items, matching for field x >= 70.");

    realm.close();
  },

  testDictionaryNotificationObjectFieldUpdate() {
    const UPDATES = 5;
    const DictSchema = {
      name: "Dictionary",
      properties: {
        fields: "{}",
      },
    };

    let realm = new Realm({ schema: [DictSchema] });
    realm.write(() => realm.create(DictSchema.name, { fields: { field1: 0, filed2: 2, field3: 3 } }));
    let fields = realm.objects(DictSchema.name)[0].fields;
    let cnt = 0;

    fields.addListener((obj, changeset) => {
      TestCase.assertEqual(fields.field1, cnt, `fields.field1: ${fields.field1} should be equals to: cnt -> ${cnt}`);
      // We ignore the first as it just reflect the creation in the line above.
      if (cnt > 0) {
        TestCase.assertEqual(
          changeset.modifications[0],
          "field1",
          `The changeset should reflect an update on field1 but it shows -> ${changeset.modifications[0]}`,
        );
      }
      cnt++;
    });

    for (let i = 1; i <= UPDATES; i++) {
      realm.write(() => {
        fields.field1 = i;
      });
    }

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        TestCase.assertEqual(realm.objects(DictSchema.name)[0].fields.field1, 5);
        TestCase.assertEqual(cnt, UPDATES + 1, `We expect ${UPDATES + 1} updates.`);
        fields.removeAllListeners();
        realm.close();
        resolve();
      }, 2500);
    });
  },

  // FIXME: Running the following test produce unexpected side-effects which breaks all subsequent tests.
  // See https://github.com/realm/realm-js/issues/3834

  // testDictionaryNotificationObjectFieldInsertion() {
  //     const DictSchema = {
  //         name: "Dictionary",
  //         properties: {
  //             fields: "{}"
  //         }
  //     };

  //     let realm = new Realm({schema: [DictSchema]});
  //     realm.write(() => realm.create(DictSchema.name, {fields: {field1: 0, filed2: 2, field3: 3}}));
  //     let ff = realm.objects(DictSchema.name)[0];
  //     let cnt = 0;

  //     let a = function (obj, changeset) {
  //         if (cnt === 1) {
  //             TestCase.assertTrue(obj.x2 !== undefined,"This field should be equal x2");
  //             TestCase.assertTrue(obj.x1 !== undefined,"This field should be equal x1");
  //             TestCase.assertArrayLength(changeset.deletions, 3, "deletions");
  //             TestCase.assertArrayLength(changeset.insertions, 2, "insertions");
  //             TestCase.assertArrayLength(changeset.modifications, 0, "modifications");
  //         }

  //         if (cnt === 2) {
  //             TestCase.assertTrue(obj.x1 !== undefined,"This field should be equal x1");
  //             TestCase.assertTrue(obj.x5 !== undefined,"This field should be equal x5");
  //             TestCase.assertTrue(obj.x3 !== undefined,"This field should be equal x3");
  //             TestCase.assertArrayLength(changeset.deletions, 2, "deletions");
  //             TestCase.assertArrayLength(changeset.insertions, 3, "insertions");
  //             TestCase.assertArrayLength(changeset.modifications, 0, "modifications");
  //         }

  //         if (cnt === 3) {
  //             let keys = Object.keys(obj);
  //             TestCase.assertEqual(keys[0], "x1", "First field should be equal x1");
  //             TestCase.assertEqual(obj.x1, "hello", "x1 should be equals to \"hello\"");
  //             TestCase.assertArrayLength(changeset.deletions, 3, "deletions");
  //             TestCase.assertArrayLength(changeset.insertions, 1, "insertions");
  //             TestCase.assertArrayLength(changeset.modifications, 0, "modifications");
  //         }
  //         cnt++;
  //     }
  //     ff.fields.addListener(a);

  //     // total object mutation.
  //     realm.write(() => { ff.fields = {x1: 1, x2: 2} } );

  //     // partial object mutation.
  //     realm.write(() => { ff.fields = {x1: 1, x3: 2, x5: 5} } );

  //     // deleting all but one field.
  //     realm.write(() => { ff.fields = {x1: "hello"} } );

  //     return new Promise((resolve, reject) => {
  //         setTimeout(() => {
  //             TestCase.assertEqual(cnt, 4, "Counter should be four");
  //             ff.fields.removeAllListeners();
  //             realm.close();
  //             resolve();
  //         }, 1000);
  //     })
  // },

  testDictionaryUserShouldDeleteFields() {
    const DictSchema = {
      name: "Dictionary",
      properties: {
        fields: "{}",
      },
    };

    let realm = new Realm({ schema: [DictSchema] });
    realm.write(() => realm.create(DictSchema.name, { fields: { x1: 0, x2: 2 } }));
    let ff = realm.objects(DictSchema.name)[0];

    realm.write(() => {
      TestCase.assertTrue(delete ff.fields.x2);
      TestCase.assertTrue(delete ff.fields.x3); // true if it doesn't exist
      TestCase.assertTrue(delete ff.fields.set);
    });

    TestCase.assertEqual(Object.keys(ff.fields).length, 1);
    TestCase.assertEqual(Object.keys(ff.fields)[0], "x1", "Should contain x1 field");
  },

  testDictionaryEventListenerRemoveAll() {
    let realm = new Realm({ schema: [DictSchema] });
    realm.write(() => realm.create(DictSchema.name, { a: { x: 1, y: 2, z: 3 } }));
    let point = realm.objects(DictSchema.name)[0].a;

    let cnt = 0;
    for (let i = 0; i < 10; i++) {
      point.addListener(function (obj, changeset) {
        cnt++;
      });
    }

    point.removeAllListeners();
    realm.write(() => (point.x = 10));

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        TestCase.assertEqual(cnt, 0);
        realm.close();
        resolve();
      }, 1000);
    });
  },

  testDictionaryRemoveCallback() {
    const DictSchemaFields = {
      name: "Dictionary",
      properties: {
        fields: "{}",
      },
    };

    let called = {
      a: 0,
      b: 0,
      c: 0,
      d: 0,
    };

    let realm = new Realm({ schema: [DictSchemaFields] });
    realm.write(() => realm.create(DictSchemaFields.name, { fields: { field1: 0, filed2: 2, field3: 3 } }));
    let fields = realm.objects(DictSchemaFields.name)[0].fields;

    let a = function (obj, chg) {
      called.a++;
    };

    let b = function (obj, chg) {
      called.b++;
    };

    let c = function (obj, chg) {
      called.c++;
    };

    let d = function (obj, chg) {
      called.d++;
    };
    fields.addListener(a);
    fields.addListener(b);
    fields.addListener(c);
    fields.addListener(d);

    fields.removeListener(a);
    fields.removeListener(b);
    fields.removeListener(d);
    fields.removeListener(d);
    fields.removeListener(d);
    fields.removeListener(d);
    fields.removeListener(d);

    realm.write(() => {
      fields.field1 = 1;
    });

    return new Promise((resolve, _) => {
      setTimeout(() => {
        TestCase.assertEqual(called.a, 0, "Function a");
        TestCase.assertEqual(called.b, 0, "Function b");
        TestCase.assertEqual(called.c, 2, "Function c"); // the first write() will also trigger a call
        TestCase.assertEqual(called.d, 0, "Function d");
        fields.removeAllListeners();
        realm.close();
        resolve();
      }, 1000);
    });
  },

  testDictionaryUnsubscribingOnEmptyListener() {
    const DictSchema = {
      name: "Dictionary",
      properties: {
        fields: "{}",
      },
    };

    let realm = new Realm({ schema: [DictSchema] });
    realm.write(() => realm.create(DictSchema.name, { fields: { field1: 0, filed2: 2, field3: 3 } }));
    let fields = realm.objects(DictSchema.name)[0].fields;

    let a = (obj, chg) => {
      TestCase.assertTrue(false, "Function a should be unsubscribed.");
    };
    let b = (obj, chg) => {
      TestCase.assertTrue(false, "Function b should be unsubscribed.");
    };

    /*
            We try to remove listeners that doesn't exist in order to provoke to test out-of-bounds and stability.
         */

    fields.removeListener(a);
    fields.removeListener(a);
    fields.removeListener(b);
    fields.removeListener(b);

    realm.write(() => {
      fields.field1 = 1;
    });

    let correct = false;
    fields.addListener((obj, chg) => {
      correct = true;
    });
    realm.write(() => {
      fields.field1 = 2;
    });

    return new Promise((resolve, _) => {
      setTimeout(() => {
        TestCase.assertEqual(fields.field1, 2);
        TestCase.assertTrue(correct, "This is expected to work.");
        fields.removeAllListeners();
        realm.close();
        resolve();
      }, 1000);
    });
  },

  testDictionarySet() {
    const DictSchema = {
      name: "Dictionary",
      properties: {
        dict: "{}",
      },
    };

    let realm = new Realm({ schema: [DictSchema] });
    realm.write(() => realm.create(DictSchema.name, { dict: { oo: 2, y: 2, z: 2 } }));

    let D = realm.objects(DictSchema.name)[0].dict;
    let T = D;

    realm.write(() => {
      D.set({ ff: 2, pp: 4 });
    });

    TestCase.assertTrue(
      JSON.stringify(D) === JSON.stringify(T),
      "Objects need to mutate when fields on the dictionary change.",
    );
    realm.close();
  },

  testDictionaryRemove() {
    const DictSchema = {
      name: "Dictionary",
      properties: {
        dict: "{}",
      },
    };
    let realm = new Realm({ schema: [DictSchema] });

    realm.write(() => realm.create(DictSchema.name, { dict: { oo: 2, y: 2, z: 2 } }));

    let D = realm.objects(DictSchema.name)[0].dict;
    let T = D;
    realm.write(() => {
      D.remove(["oo", "y", "z"]);
    });

    TestCase.assertTrue(
      JSON.stringify(D) === JSON.stringify(T),
      "Objects need to mutate when fields on the dictionary change.",
    );
    TestCase.assertEqual(Object.keys(D).length, 0, "We should have an empty object.");

    realm.write(() => {
      D.set({ ff: 2, pp: "111011" });
    });

    TestCase.assertTrue(
      JSON.stringify(D) === JSON.stringify(T),
      "Objects need to mutate when fields on the dictionary change.",
    );

    // remove an unknown key is not an error
    realm.write(() => {
      D.remove(["unknown_key"]);
    });
    realm.close();
  },

  testDictionaryToJSON() {
    let realm = new Realm({ schema: [DictSchema] });
    realm.write(() => realm.create(DictSchema.name, { a: { x: 1, y: 2, z: 3 } }));

    let data = realm.objects(DictSchema.name);
    TestCase.assertEqual(
      JSON.stringify(data.toJSON()),
      '[{"a":{"x":1,"z":3,"y":2}}]',
      "toJSON should return the correct result",
    );

    realm.close();
  },

  testDictionaryWithNestedModels() {
    const Child = {
      name: "Children",
      properties: {
        num: "int",
      },
    };

    const DictSchema = {
      name: "Dictionary",
      properties: {
        dict1: "{}",
        dict2: "{}",
      },
    };

    let realm = new Realm({ schema: [DictSchema, Child] });

    realm.write(() => {
      let child1 = realm.create(Child.name, { num: 555 });
      let child2 = realm.create(Child.name, { num: 666 });
      realm.create(DictSchema.name, {
        dict1: { children1: child1, children2: child2 },
        dict2: { children1: child2, children2: child1 },
      });
    });

    TestCase.assertEqual(realm.objects(DictSchema.name).length, 1, "A new field have to be inserted.");

    let dict_1 = realm.objects(DictSchema.name)[0].dict1;
    let dict_2 = realm.objects(DictSchema.name)[0].dict2;

    TestCase.assertTrue(dict_1 !== undefined, "dict_1 should be defined.");
    TestCase.assertTrue(dict_2 !== undefined, "dict_2 should be defined.");
    TestCase.assertTrue(dict_1.children1 !== undefined, "dict_1.Children1 should be defined.");
    TestCase.assertTrue(dict_1.children2 !== undefined, "dict_1.Children2 should be defined.");
    TestCase.assertTrue(dict_2.children1 !== undefined, "dict_2.children1 should be defined.");
    TestCase.assertTrue(dict_2.children2 !== undefined, "dict_2.Children2 should be defined.");
    TestCase.assertEqual(dict_1.children1.num, 555, "We expect children1#555");
    TestCase.assertEqual(dict_1.children2.num, 666, "We expect children2#666");
    TestCase.assertEqual(dict_2.children1.num, 666, "We expect children1#666");
    TestCase.assertEqual(dict_2.children2.num, 555, "We expect children2#555");

    realm.close();
  },

  testDictionaryUpdatingWithNestedModels() {
    const Child = {
      name: "Children",
      properties: {
        num: "int",
      },
    };

    const DictSchema = {
      name: "Dictionary",
      properties: {
        dict1: "{}",
        dict2: "{}",
      },
    };

    let realm = new Realm({ schema: [DictSchema, Child] });
    realm.write(() => {
      realm.create(DictSchema.name, {
        dict1: { children1: "x", children2: "y" },
        dict2: { children1: "y", children2: "x" },
      });
    });

    let dict_1 = realm.objects(DictSchema.name)[0].dict1;
    let dict_2 = realm.objects(DictSchema.name)[0].dict2;

    realm.write(() => {
      let child1 = realm.create(Child.name, { num: 555 });
      let child2 = realm.create(Child.name, { num: 666 });
      dict_1.set({ children1: child1, children2: child2 });
    });

    TestCase.assertEqual(dict_1.children1.num, 555, "We expect children1#555");
    TestCase.assertEqual(dict_1.children2.num, 666, "We expect children2#666");
    TestCase.assertEqual(dict_2.children1, "y", "We expect children1#y");
    TestCase.assertEqual(dict_2.children2, "x", "We expect children2#x");

    realm.close();
  },

  testDictionaryErrorHandling() {
    let realm = new Realm({ schema: [DictSchema] });
    TestCase.assertThrowsContaining(() => {
      realm.write(() => {
        realm.create(DictSchema.name, { a: { x: {} } });
      });
    }, "Only Realm instances are supported.");
    realm.write(() => realm.create(DictSchema.name, { a: { x: null } }));
    let data = realm.objects(DictSchema.name)[0].a;
    TestCase.assertEqual(data.x, null, "Should be an equals to mutable.x = null");
    realm.close();
  },

  testDictionaryEmbeddedObject() {
    const Child = {
      name: "Children",
      embedded: true,
      properties: {
        num: "int",
      },
    };

    const DictTypedSchema = {
      name: "TypedDictionary",
      properties: {
        dict1: { type: "dictionary", objectType: "Children" }, // dictionary of objects is nullable by default
        dict2: { type: "dictionary", objectType: "Children", optional: true },
      },
    };

    const DictMixedSchema = {
      name: "MixedDictionary",
      properties: {
        dict1: "{}",
        dict2: "{}",
      },
    };

    let realm = new Realm({ schema: [DictTypedSchema, DictMixedSchema, Child] });
    realm.write(() => {
      realm.create(DictTypedSchema.name, {
        dict1: { children1: { num: 2 }, children2: { num: 3 } },
        dict2: { children1: { num: 4 }, children2: { num: 5 } },
      });
    });

    realm.write(() => {
      const error = new Error("Only Realm instances are supported.");
      TestCase.assertThrows(() => {
        realm.create(DictMixedSchema.name, {
          dict1: { children1: { num: 2 }, children2: { num: 3 } },
          dict2: { children1: { num: 4 }, children2: { num: 5 } },
        });
      }, error);
    });

    let dict_1 = realm.objects(DictTypedSchema.name)[0].dict1;
    let dict_2 = realm.objects(DictTypedSchema.name)[0].dict2;

    TestCase.assertEqual(dict_1.children1.num, 2, "We expect children1#2");
    TestCase.assertEqual(dict_1.children2.num, 3, "We expect children2#3");
    TestCase.assertEqual(dict_2.children1.num, 4, "We expect children1#4");
    TestCase.assertEqual(dict_2.children2.num, 5, "We expect children2#5");

    realm.close();
  },
};
