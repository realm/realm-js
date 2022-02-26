////////////////////////////////////////////////////////////////////////////
//
// Copyright 2016 Realm Inc.
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

const isNodeProcess = typeof process === "object" && process + "" === "[object process]";

const Realm = require("realm");
const TestCase = require("./asserts");
const schemas = require("./schemas");
const buffer = require("buffer");

const RANDOM_DATA = new Uint8Array([
  0xd8, 0x21, 0xd6, 0xe8, 0x00, 0x57, 0xbc, 0xb2, 0x6a, 0x15, 0x77, 0x30, 0xac, 0x77, 0x96, 0xd9, 0x67, 0x1e, 0x40,
  0xa7, 0x6d, 0x52, 0x83, 0xda, 0x07, 0x29, 0x9c, 0x70, 0x38, 0x48, 0x4e, 0xff,
]);

const allTypesValues = {
  boolCol: true,
  intCol: 1,
  floatCol: 1.1,
  doubleCol: 1.11,
  stringCol: "string",
  dateCol: new Date(1),
  dataCol: RANDOM_DATA,
  objectCol: { doubleCol: 2.2 },

  optBoolCol: true,
  optIntCol: 1,
  optFloatCol: 1.1,
  optDoubleCol: 1.11,
  optStringCol: "string",
  optDateCol: new Date(1),
  optDataCol: RANDOM_DATA,

  boolArrayCol: [true],
  intArrayCol: [1],
  floatArrayCol: [1.1],
  doubleArrayCol: [1.11],
  stringArrayCol: ["string"],
  dateArrayCol: [new Date(1)],
  dataArrayCol: [RANDOM_DATA],
  objectArrayCol: [{ doubleCol: 2.2 }],

  optBoolArrayCol: [true],
  optIntArrayCol: [1],
  optFloatArrayCol: [1.1],
  optDoubleArrayCol: [1.11],
  optStringArrayCol: ["string"],
  optDateArrayCol: [new Date(1)],
  optDataArrayCol: [RANDOM_DATA],
};
const nullPropertyValues = (() => {
  let values = {};
  for (let name in allTypesValues) {
    if (name.includes("opt")) {
      values[name] = name.includes("Array") ? [null] : null;
    } else {
      values[name] = allTypesValues[name];
    }
  }
  return values;
})();

module.exports = {
  testAllPropertyGetters: function () {
    const realm = new Realm({ schema: [schemas.AllTypes, schemas.TestObject, schemas.LinkToAllTypes] });
    let object, nullObject;

    realm.write(function () {
      object = realm.create("AllTypesObject", allTypesValues);
      nullObject = realm.create("AllTypesObject", nullPropertyValues);
    });

    const objectSchema = realm.schema[0];
    for (const name of Object.keys(objectSchema.properties)) {
      const type = objectSchema.properties[name].type;
      if (type === "linkingObjects") {
        TestCase.assertEqual(object[name].length, 0);
        TestCase.assertEqual(nullObject[name].length, 0);
        continue;
      }

      let objectTarget = object[name];
      let nullObjectTarget = nullObject[name];

      TestCase.assertSimilar(type, objectTarget, allTypesValues[name]);
      TestCase.assertSimilar(type, nullObjectTarget, nullPropertyValues[name]);
    }

    TestCase.assertEqual(object.nonexistent, undefined);
  },

  testAllTypesPropertySetters: function () {
    const realm = new Realm({ schema: [schemas.AllTypes, schemas.TestObject, schemas.LinkToAllTypes] });
    let obj;

    realm.write(function () {
      obj = realm.create("AllTypesObject", allTypesValues);
    });

    TestCase.assertThrows(function () {
      obj.boolCol = false;
    }, "can only set property values in a write transaction");

    TestCase.assertEqual(obj.boolCol, true, "bool value changed outside transaction");

    realm.write(function () {
      TestCase.assertThrows(() => (obj.boolCol = "cat"));
      TestCase.assertThrows(() => (obj.intCol = "dog"));

      // Non-optional properties should complain about null
      for (const name of ["boolCol", "intCol", "floatCol", "doubleCol", "stringCol", "dataCol", "dateCol"]) {
        TestCase.assertThrows(() => (obj[name] = null), `Setting ${name} to null should throw`);
        TestCase.assertThrows(() => (obj[name] = undefined), `Setting ${name} to undefined should throw`);
      }

      // Optional properties should allow it
      for (const name of [
        "optBoolCol",
        "optIntCol",
        "optFloatCol",
        "optDoubleCol",
        "optStringCol",
        "optDataCol",
        "optDateCol",
        "objectCol",
      ]) {
        obj[name] = null;
        TestCase.assertEqual(obj[name], null);
        obj[name] = undefined;
        TestCase.assertEqual(obj[name], null);
      }

      function tryAssign(name, value) {
        var prop = schemas.AllTypes.properties[name];
        var type = typeof prop == "object" ? prop.type : prop;
        obj[name] = value;
        TestCase.assertSimilar(type, obj[name], value, undefined, 1);
      }

      tryAssign("boolCol", false);
      tryAssign("intCol", 10);
      tryAssign("floatCol", 2.2);
      tryAssign("doubleCol", 3.3);
      tryAssign("stringCol", "new str");
      tryAssign("dateCol", new Date(2));
      tryAssign("dataCol", RANDOM_DATA);

      tryAssign("optBoolCol", null);
      tryAssign("optIntCol", null);
      tryAssign("optFloatCol", null);
      tryAssign("optDoubleCol", null);
      tryAssign("optStringCol", null);
      tryAssign("optDateCol", null);
      tryAssign("optDataCol", null);

      tryAssign("optBoolCol", false);
      tryAssign("optIntCol", 10);
      tryAssign("optFloatCol", 2.2);
      tryAssign("optDoubleCol", 3.3);
      tryAssign("optStringCol", "new str");
      tryAssign("optDateCol", new Date(2));
      tryAssign("optDataCol", RANDOM_DATA);
    });
  },

  testLinkTypesPropertyGetters: function () {
    const realm = new Realm({ schema: [schemas.LinkTypes, schemas.TestObject] });
    var obj = null;

    realm.write(function () {
      obj = realm.create("LinkTypesObject", {
        objectCol: { doubleCol: 1 },
        objectCol1: null,
        arrayCol: [{ doubleCol: 3 }],
      });
    });

    var objVal = obj.objectCol;
    TestCase.assertEqual(typeof objVal, "object");
    TestCase.assertNotEqual(objVal, null);
    TestCase.assertEqual(objVal.doubleCol, 1);

    TestCase.assertEqual(obj.objectCol1, null);

    var arrayVal = obj.arrayCol;
    TestCase.assertEqual(typeof arrayVal, "object");
    TestCase.assertNotEqual(arrayVal, null);
    TestCase.assertEqual(arrayVal.length, 1);
    TestCase.assertEqual(arrayVal[0].doubleCol, 3);
  },

  testLinkTypesPropertySetters: function () {
    const realm = new Realm({ schema: [schemas.LinkTypes, schemas.TestObject] });
    var objects = realm.objects("TestObject");
    var obj;

    realm.write(function () {
      obj = realm.create("LinkTypesObject", {
        objectCol: { doubleCol: 1 },
        objectCol1: null,
        arrayCol: [{ doubleCol: 3 }],
      });
    });

    TestCase.assertEqual(objects.length, 2);

    TestCase.assertThrows(function () {
      obj.objectCol1 = obj.objectCol;
    }, "can only set property values in a write transaction");

    // set/reuse object property
    realm.write(function () {
      obj.objectCol1 = obj.objectCol;
    });
    TestCase.assertEqual(obj.objectCol1.doubleCol, 1);
    //TestCase.assertEqual(obj.objectCol, obj.objectCol1);
    TestCase.assertEqual(objects.length, 2);

    realm.write(function () {
      obj.objectCol = null;
      obj.objectCol1 = null;
    });
    TestCase.assertEqual(obj.objectCol, null);
    TestCase.assertEqual(obj.objectCol1, null);

    // set object as JSON
    realm.write(function () {
      obj.objectCol = { doubleCol: 1 };
    });
    TestCase.assertEqual(obj.objectCol.doubleCol, 1);
    TestCase.assertEqual(objects.length, 3);

    // set array property
    realm.write(function () {
      obj.arrayCol = [obj.arrayCol[0], obj.objectCol, realm.create("TestObject", { doubleCol: 2 })];
    });

    TestCase.assertEqual(objects.length, 4);
    TestCase.assertEqual(obj.arrayCol.length, 3);
    TestCase.assertEqual(obj.arrayCol[0].doubleCol, 3);
    TestCase.assertEqual(obj.arrayCol[1].doubleCol, 1);
    TestCase.assertEqual(obj.arrayCol[2].doubleCol, 2);

    // set object from another realm
    var another = new Realm({ path: "another.realm", schema: realm.schema });
    var anotherObj;
    another.write(function () {
      anotherObj = another.create("TestObject", { doubleCol: 3 });
    });
    realm.write(function () {
      obj.objectCol = anotherObj;
    });
    TestCase.assertEqual(obj.objectCol.doubleCol, 3);
  },

  testEnumerablePropertyNames: function () {
    const realm = new Realm({ schema: [schemas.AllTypes, schemas.TestObject, schemas.LinkToAllTypes] });
    let object;

    realm.write(() => (object = realm.create("AllTypesObject", allTypesValues)));

    const propNames = Object.keys(schemas.AllTypes.properties);
    TestCase.assertArraysEqual(Object.keys(Object.getPrototypeOf(object)), propNames, "Object.keys");

    for (let key in object) {
      TestCase.assertEqual(key, propNames.shift());
    }

    TestCase.assertEqual(propNames.length, 0);
  },

  testDataProperties: function () {
    const realm = new Realm({ schema: [schemas.DefaultValues, schemas.TestObject] });
    var object;

    // Should be be able to set a data property with a typed array.
    realm.write(function () {
      object = realm.create("DefaultValuesObject", { dataCol: RANDOM_DATA });
    });

    // Data properties should return an instance of an ArrayBuffer.
    TestCase.assertTrue(object.dataCol instanceof ArrayBuffer);
    TestCase.assertArraysEqual(new Uint8Array(object.dataCol), RANDOM_DATA);

    // Should be able to also set a data property to an ArrayBuffer.
    realm.write(function () {
      object.dataCol = RANDOM_DATA.buffer;
    });

    TestCase.assertArraysEqual(new Uint8Array(object.dataCol), RANDOM_DATA);

    if (Realm.App.Sync) {
      // The base64 decoder comes from realm-sync
      // Should be able to also set a data property to base64-encoded string.
      realm.write(function () {
        object.dataCol = buffer.Buffer.from(RANDOM_DATA).toString("base64");
      });
      TestCase.assertArraysEqual(new Uint8Array(object.dataCol), RANDOM_DATA);
    }

    // Should be to set a data property to a DataView.
    realm.write(function () {
      object.dataCol = new DataView(RANDOM_DATA.buffer);
    });

    TestCase.assertArraysEqual(new Uint8Array(object.dataCol), RANDOM_DATA);

    // Test that a variety of size and slices of data still work.
    [
      [0, -1],
      [0, -2],
      [1, 0],
      [1, -1],
      [1, -2],
      [2, 0],
      [2, -1],
      [2, -2],
    ].forEach(function (range) {
      var array = RANDOM_DATA.subarray(range[0], range[1]);
      realm.write(function () {
        // Use a partial "view" of the underlying ArrayBuffer.
        if (array.length > 0) {
          object.dataCol = new Uint8Array(RANDOM_DATA.buffer, range[0], array.length);
        }
      });

      if (array.length > 0) {
        TestCase.assertArraysEqual(new Uint8Array(object.dataCol), array, range.join("..."));
      }
    });

    // Test other TypedArrays to make sure they all work for setting data properties.
    [
      Int8Array,
      Uint8ClampedArray,
      Int16Array,
      Uint16Array,
      Int32Array,
      Uint32Array,
      Float32Array,
      Float64Array,
    ].forEach(function (TypedArray) {
      var array = new TypedArray(RANDOM_DATA.buffer);
      realm.write(function () {
        object.dataCol = array;
      });
      TestCase.assertArraysEqual(new TypedArray(object.dataCol), array, TypedArray.name);
    });

    realm.write(function () {
      TestCase.assertThrows(function () {
        object.dataCol = true;
      });
      TestCase.assertThrows(function () {
        object.dataCol = 1;
      });
      TestCase.assertThrows(function () {
        object.dataCol = "some binary data";
      });
      TestCase.assertThrows(function () {
        object.dataCol = [1];
      });
    });
  },

  testObjectConstructor: function () {
    const realm = new Realm({ schema: [schemas.TestObject] });

    realm.write(function () {
      var obj = realm.create("TestObject", { doubleCol: 1 });
      TestCase.assertTrue(obj instanceof Realm.Object);
    });

    TestCase.assertEqual(typeof Realm.Object, "function");
    TestCase.assertTrue(Realm.Object instanceof Function);
  },

  testObjectIsValid: function () {
    const realm = new Realm({ schema: [schemas.TestObject] });
    var obj;
    realm.write(function () {
      obj = realm.create("TestObject", { doubleCol: 1 });
      TestCase.assertEqual(obj.isValid(), true);
      realm.delete(obj);
      TestCase.assertEqual(obj.isValid(), false);
    });

    TestCase.assertEqual(obj.isValid(), false);
    TestCase.assertThrows(function () {
      obj.doubleCol;
    });
  },

  testObjectSchema: function () {
    const realm = new Realm({ schema: [schemas.TestObject] });
    var obj;
    realm.write(function () {
      obj = realm.create("TestObject", { doubleCol: 1 });
    });

    const schema = obj.objectSchema();
    TestCase.assertEqual(schema.name, schemas.TestObject.name);
    TestCase.assertArraysEqual(Object.keys(schema.properties), Object.keys(schemas.TestObject.properties));
    TestCase.assertEqual(schema.properties.doubleCol.type, "double");
  },

  testIgnoredProperties: function () {
    var realm = new Realm({ schema: [schemas.TestObject] });
    var obj;
    realm.write(function () {
      obj = realm.create("TestObject", { doubleCol: 1, ignored: true });
    });

    TestCase.assertEqual(obj.doubleCol, 1);
    TestCase.assertEqual(obj.ignored, undefined);
    obj.ignored = true;
    TestCase.assertEqual(obj.ignored, true);
  },

  testDates: function () {
    var realm = new Realm({ schema: [schemas.DateObject] });
    const stringifiedDate = new Date();
    realm.write(function () {
      realm.create("Date", { currentDate: new Date(10000) });
      realm.create("Date", { currentDate: new Date(-10000) });
      realm.create("Date", { currentDate: new Date(1000000000000) });
      realm.create("Date", { currentDate: new Date(-1000000000000) });
      realm.create("Date", { currentDate: stringifiedDate.toString() });
    });
    TestCase.assertEqual(realm.objects("Date")[0].currentDate.getTime(), 10000);
    TestCase.assertEqual(realm.objects("Date")[1].currentDate.getTime(), -10000);
    TestCase.assertEqual(realm.objects("Date")[2].currentDate.getTime(), 1000000000000);
    TestCase.assertEqual(realm.objects("Date")[3].currentDate.getTime(), -1000000000000);
    TestCase.assertEqual(realm.objects("Date")[4].currentDate.toString(), stringifiedDate.toString());
  },

  testDateResolution: function () {
    const dateObjectSchema = {
      name: "DateObject",
      properties: {
        dateCol: "date",
      },
    };

    var realm = new Realm({ schema: [dateObjectSchema] });
    realm.write(function () {
      realm.create("DateObject", { dateCol: new Date("2017-12-07T20:16:03.837Z") });
    });

    var objects = realm.objects("DateObject");
    TestCase.assertEqual(new Date("2017-12-07T20:16:03.837Z").getTime(), objects[0].dateCol.getTime());
    TestCase.assertTrue(new Date("2017-12-07T20:16:03.837Z").toISOString() === objects[0].dateCol.toISOString());

    realm.close();
  },

  testSetLink: function () {
    const schema = [
      {
        name: "PrimaryInt",
        primaryKey: "pk",
        properties: {
          pk: "int",
          value: "int",
        },
      },
      {
        name: "PrimaryOptionalInt",
        primaryKey: "pk",
        properties: {
          pk: "int?",
          value: "int",
        },
      },
      {
        name: "PrimaryString",
        primaryKey: "pk",
        properties: {
          pk: "string?",
          value: "int",
        },
      },
      {
        name: "Links",
        properties: {
          intLink: "PrimaryInt",
          optIntLink: "PrimaryOptionalInt",
          stringLink: "PrimaryString",
        },
      },
    ];

    const realm = new Realm({ schema: schema });
    realm.write(function () {
      realm.create("PrimaryInt", { pk: 1, value: 2 });
      realm.create("PrimaryInt", { pk: 2, value: 4 });
      realm.create("PrimaryOptionalInt", { pk: 1, value: 2 });
      realm.create("PrimaryOptionalInt", { pk: 2, value: 4 });
      realm.create("PrimaryOptionalInt", { pk: null, value: 6 });
      realm.create("PrimaryString", { pk: "a", value: 2 });
      realm.create("PrimaryString", { pk: "b", value: 4 });
      realm.create("PrimaryString", { pk: null, value: 6 });

      const obj = realm.create("Links", {});

      obj._setLink("intLink", 3);
      TestCase.assertEqual(obj.intLink, null);
      obj._setLink("intLink", 1);
      TestCase.assertEqual(obj.intLink.value, 2);
      obj._setLink("intLink", 2);
      TestCase.assertEqual(obj.intLink.value, 4);
      obj._setLink("intLink", 3);
      TestCase.assertEqual(obj.intLink, null);

      obj._setLink("optIntLink", 3);
      TestCase.assertEqual(obj.optIntLink, null);
      obj._setLink("optIntLink", 1);
      TestCase.assertEqual(obj.optIntLink.value, 2);
      obj._setLink("optIntLink", 2);
      TestCase.assertEqual(obj.optIntLink.value, 4);
      obj._setLink("optIntLink", null);
      TestCase.assertEqual(obj.optIntLink.value, 6);
      obj._setLink("optIntLink", 3);
      TestCase.assertEqual(obj.optIntLink, null);

      obj._setLink("stringLink", "c");
      TestCase.assertEqual(obj.stringLink, null);
      obj._setLink("stringLink", "a");
      TestCase.assertEqual(obj.stringLink.value, 2);
      obj._setLink("stringLink", "b");
      TestCase.assertEqual(obj.stringLink.value, 4);
      obj._setLink("stringLink", null);
      TestCase.assertEqual(obj.stringLink.value, 6);
      obj._setLink("stringLink", "c");
      TestCase.assertEqual(obj.stringLink, null);
    });
  },

  testNotification: async function () {
    const realm = new Realm({ schema: [schemas.StringOnly] });

    let calls = 0;
    let resolve;
    let reject;

    let promise = new Promise((res, rej) => {
      (resolve = res), (reject = rej);
    });
    let obj;
    realm.write(() => {
      obj = realm.create(schemas.StringOnly.name, { stringCol: "foo" });
    });

    obj.addListener((obj, changes) => {
      try {
        calls++;
        switch (calls) {
          case 1:
            break;
          case 2:
            TestCase.assertFalse(changes.deleted);
            TestCase.assertEqual(changes.changedProperties.length, 1);
            TestCase.assertEqual(changes.changedProperties[0], "stringCol");
            TestCase.assertEqual(obj["stringCol"], "bar");
            break;
          case 3:
            TestCase.assertTrue(changes.deleted);
            TestCase.assertEqual(changes.changedProperties.length, 0);
            realm.close();
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
    realm.write(() => {
      obj["stringCol"] = "bar";
    });
    await promise;

    promise = new Promise((res, rej) => {
      (resolve = res), (reject = rej);
    });
    realm.write(() => {
      realm.delete(obj);
    });
    await promise;
  },

  testAddAndRemoveListener: async function () {
    const realm = new Realm({ schema: [schemas.StringOnly] });

    let obj;
    realm.write(function () {
      obj = realm.create(schemas.StringOnly.name, { stringCol: "foo" });
    });

    let calls = 0;
    let resolve;

    let listener = function (obj, changes) {
      calls++;
      if (calls === 1) {
        TestCase.assertEqual(obj["stringCol"], "foo");
      } else if (calls === 2) {
        TestCase.assertEqual(obj["stringCol"], "bar");
      } else {
        throw new Error("Too many calls to listener");
      }
      resolve();
    };

    const initialNotification = new Promise((r) => (resolve = r));
    obj.addListener(listener);
    await initialNotification;

    const firstChange = new Promise((r) => (resolve = r));
    realm.write(function () {
      obj["stringCol"] = "bar";
    });
    await firstChange;
    obj.removeListener(listener);

    realm.write(function () {
      obj["stringCol"] = "foobar";
    });

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        TestCase.assertEqual(realm.objects(schemas.StringOnly.name)[0]["stringCol"], "foobar");
        TestCase.assertEqual(calls, 2); // listener only called twice
        realm.close();
        resolve();
      }, 2000);
    });
  },

  testAddAndRemoveAllListeners: function () {
    const realm = new Realm({ schema: [schemas.StringOnly] });

    let obj;
    realm.write(function () {
      obj = realm.create(schemas.StringOnly.name, { stringCol: "foo" });
    });

    let calls = 0;

    let listener = function (obj, changes) {
      calls++;
      if (calls === 2) {
        TestCase.assertEqual(obj["stringCol"], "bar");
      }
    };

    obj.addListener(listener);

    return new Promise((resolve, reject) => {
      realm.write(function () {
        obj["stringCol"] = "bar";
      });

      setTimeout(() => {
        obj.removeAllListeners();
        realm.write(function () {
          obj["stringCol"] = "foobar";
        });

        setTimeout(() => {
          TestCase.assertEqual(realm.objects(schemas.StringOnly.name)[0]["stringCol"], "foobar");
          TestCase.assertEqual(calls, 2); // listener only called twice
          realm.close();
          resolve();
        }, 2000);
      }, 2000);
    });
  },

  testGetPropertyType: function () {
    const MixedSchema = {
      name: "MixedSchema",
      properties: {
        key: "string",
        value: "mixed",
      },
    };
    const realm = new Realm({
      schema: [schemas.AllTypes, schemas.TestObject, schemas.LinkToAllTypes, MixedSchema],
    });
    let obj, mixedNull, mixedInt, mixedString, mixedFloat, mixedBool;

    realm.write(() => {
      obj = realm.create(schemas.AllTypes.name, allTypesValues);
      mixedNull = realm.create(MixedSchema.name, { key: "zero", value: null });
      mixedInt = realm.create(MixedSchema.name, { key: "one", value: 1 }); // for mixed, all JavaScript numbers are saved as "double"
      mixedString = realm.create(MixedSchema.name, { key: "two", value: "two" });
      mixedFloat = realm.create(MixedSchema.name, { key: "three", value: 3.0 });
      mixedBool = realm.create(MixedSchema.name, { key: "five", value: true });
    });

    TestCase.assertEqual(obj.getPropertyType("boolCol"), "bool");
    TestCase.assertEqual(obj.getPropertyType("floatCol"), "float");
    TestCase.assertEqual(obj.getPropertyType("doubleCol"), "double");
    TestCase.assertEqual(obj.getPropertyType("stringCol"), "string");
    TestCase.assertEqual(obj.getPropertyType("dateCol"), "date");
    TestCase.assertEqual(obj.getPropertyType("dataCol"), "data");
    TestCase.assertEqual(obj.getPropertyType("objectCol"), "<TestObject>");

    TestCase.assertEqual(obj.getPropertyType("boolArrayCol"), "array<bool>");
    TestCase.assertEqual(obj.getPropertyType("floatArrayCol"), "array<float>");
    TestCase.assertEqual(obj.getPropertyType("doubleArrayCol"), "array<double>");
    TestCase.assertEqual(obj.getPropertyType("stringArrayCol"), "array<string>");
    TestCase.assertEqual(obj.getPropertyType("dateArrayCol"), "array<date>");
    TestCase.assertEqual(obj.getPropertyType("dataArrayCol"), "array<data>");
    TestCase.assertEqual(obj.getPropertyType("objectArrayCol"), "array<TestObject>");

    TestCase.assertEqual(mixedNull.getPropertyType("value"), "null");
    TestCase.assertEqual(mixedInt.getPropertyType("value"), "double"); // see comment above
    TestCase.assertEqual(mixedString.getPropertyType("value"), "string");
    TestCase.assertEqual(mixedFloat.getPropertyType("value"), "double");
    TestCase.assertEqual(mixedBool.getPropertyType("value"), "bool");
    [mixedNull, mixedInt, mixedFloat, mixedString, mixedBool].forEach((mixed) => {
      TestCase.assertEqual(mixed.getPropertyType("key"), "string", `${mixed.key}`);
    });

    // property that does not exist
    TestCase.assertThrowsException(() => {
      obj.getPropertyType("foo");
    }, new Error("No such property: foo"));
  },
};
