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

const { Realm } = require("realm");
const { Decimal128, ObjectId, UUID } = Realm.BSON;
let TestCase = require("./asserts");
let schemas = require("./schemas");

const DATA1 = new Uint8Array([0x01]);
const DATA2 = new Uint8Array([0x02]);
const DATA3 = new Uint8Array([0x03]);
const DATE1 = new Date(1);
const DATE2 = new Date(2);
const DATE3 = new Date(3);

const isNodeProcess = typeof process === "object" && process + "" === "[object process]";
const isElectronProcess = typeof process === "object" && process.versions && process.versions.electron;

module.exports = {
  testListConstructor: function () {
    const realm = new Realm({ schema: [schemas.PersonObject, schemas.PersonList] });
    realm.write(() => {
      let obj = realm.create("PersonList", { list: [] });
      TestCase.assertInstanceOf(obj.list, Realm.List);
      TestCase.assertInstanceOf(obj.list, Realm.Collection);
    });

    TestCase.assertThrowsContaining(() => new Realm.List(), "constructor");
    TestCase.assertInstanceOf(Realm.List, Function);
  },

  testListType: function () {
    const realm = new Realm({ schema: [schemas.LinkTypes, schemas.TestObject, schemas.PrimitiveArrays] });

    let obj, prim;
    realm.write(() => {
      obj = realm.create("LinkTypesObject", {});
      prim = realm.create("PrimitiveArrays", {});
    });

    // Check instance type
    TestCase.assertEqual(obj.arrayCol.type, "object");
    TestCase.assertEqual(obj.arrayCol1.type, "object");

    TestCase.assertEqual(prim.bool.type, "bool");
    TestCase.assertEqual(prim.int.type, "int");
    TestCase.assertEqual(prim.float.type, "float");
    TestCase.assertEqual(prim.double.type, "double");
    TestCase.assertEqual(prim.string.type, "string");
    TestCase.assertEqual(prim.date.type, "date");
    TestCase.assertEqual(prim.decimal128.type, "decimal128");
    TestCase.assertEqual(prim.objectId.type, "objectId");
    TestCase.assertEqual(prim.uuid.type, "uuid");

    TestCase.assertEqual(prim.optBool.type, "bool");
    TestCase.assertEqual(prim.optInt.type, "int");
    TestCase.assertEqual(prim.optFloat.type, "float");
    TestCase.assertEqual(prim.optDouble.type, "double");
    TestCase.assertEqual(prim.optString.type, "string");
    TestCase.assertEqual(prim.optDate.type, "date");
    TestCase.assertEqual(prim.optDecimal128.type, "decimal128");
    TestCase.assertEqual(prim.optObjectId.type, "objectId");
    TestCase.assertEqual(prim.optUuid.type, "uuid");

    // Check schema objectType
    const pa = realm.schema.find((s) => s.name === schemas.PrimitiveArrays.name);

    TestCase.assertEqual(pa.properties.bool.objectType, "bool");
    TestCase.assertEqual(pa.properties.int.objectType, "int");
    TestCase.assertEqual(pa.properties.float.objectType, "float");
    TestCase.assertEqual(pa.properties.double.objectType, "double");
    TestCase.assertEqual(pa.properties.string.objectType, "string");
    TestCase.assertEqual(pa.properties.date.objectType, "date");
    TestCase.assertEqual(pa.properties.decimal128.objectType, "decimal128");
    TestCase.assertEqual(pa.properties.objectId.objectType, "objectId");
    TestCase.assertEqual(pa.properties.uuid.objectType, "uuid");

    TestCase.assertEqual(pa.properties.optBool.objectType, "bool");
    TestCase.assertEqual(pa.properties.optInt.objectType, "int");
    TestCase.assertEqual(pa.properties.optFloat.objectType, "float");
    TestCase.assertEqual(pa.properties.optDouble.objectType, "double");
    TestCase.assertEqual(pa.properties.optString.objectType, "string");
    TestCase.assertEqual(pa.properties.optDate.objectType, "date");
    TestCase.assertEqual(pa.properties.optDecimal128.objectType, "decimal128");
    TestCase.assertEqual(pa.properties.optObjectId.objectType, "objectId");
    TestCase.assertEqual(pa.properties.optUuid.objectType, "uuid");

    // Check optional
    TestCase.assertFalse(prim.bool.optional);
    TestCase.assertFalse(prim.int.optional);
    TestCase.assertFalse(prim.float.optional);
    TestCase.assertFalse(prim.double.optional);
    TestCase.assertFalse(prim.string.optional);
    TestCase.assertFalse(prim.date.optional);
    TestCase.assertFalse(prim.decimal128.optional);
    TestCase.assertFalse(prim.objectId.optional);
    TestCase.assertFalse(prim.uuid.optional);

    TestCase.assertTrue(prim.optBool.optional);
    TestCase.assertTrue(prim.optInt.optional);
    TestCase.assertTrue(prim.optFloat.optional);
    TestCase.assertTrue(prim.optDouble.optional);
    TestCase.assertTrue(prim.optString.optional);
    TestCase.assertTrue(prim.optDate.optional);
    TestCase.assertTrue(prim.optDecimal128.optional);
    TestCase.assertTrue(prim.optObjectId.optional);
    TestCase.assertTrue(prim.optUuid.optional);
  },

  testListLength: function () {
    const realm = new Realm({ schema: [schemas.LinkTypes, schemas.TestObject] });
    let array;

    realm.write(() => {
      let obj = realm.create("LinkTypesObject", {
        objectCol: { doubleCol: 1 },
        objectCol1: { doubleCol: 2 },
        arrayCol: [{ doubleCol: 3 }],
      });

      array = obj.arrayCol;
      TestCase.assertEqual(array.length, 1);

      obj.arrayCol = [];
      TestCase.assertEqual(array.length, 0);

      obj.arrayCol = [{ doubleCol: 1 }, { doubleCol: 2 }];
      TestCase.assertEqual(array.length, 2);

      TestCase.assertThrowsContaining(() => (array.length = 0), "Cannot assign to read only property 'length'");
    });

    TestCase.assertEqual(array.length, 2);
  },

  testListSubscriptGetters: function () {
    const realm = new Realm({ schema: [schemas.LinkTypes, schemas.TestObject, schemas.PrimitiveArrays] });
    let obj, prim;

    realm.write(() => {
      obj = realm.create("LinkTypesObject", {
        objectCol: { doubleCol: 1 },
        objectCol1: { doubleCol: 2 },
        arrayCol: [{ doubleCol: 3 }, { doubleCol: 4 }],
        arrayCol1: [{ doubleCol: 5 }, { doubleCol: 6 }],
      });
      prim = realm.create("PrimitiveArrays", {
        bool: [true, false],
        int: [1, 2],
        float: [1.1, 2.2],
        double: [1.11, 2.22],
        string: ["a", "b"],
        date: [new Date(1), new Date(2)],
        data: [DATA1, DATA2],
        decimal128: [Decimal128.fromString("1"), Decimal128.fromString("2")],
        objectId: [new ObjectId("0000002a9a7969d24bea4cf2"), new ObjectId("0000002a9a7969d24bea4cf3")],
        uuid: [new UUID("a4078b20-7b0c-4de4-929c-4cc1c7d8345f"), new UUID("b7821fd0-38cf-4f94-8650-d0f5b6295ef4")],

        optBool: [true, null],
        optInt: [1, null],
        optFloat: [1.1, null],
        optDouble: [1.11, null],
        optString: ["a", null],
        optDate: [new Date(1), null],
        optData: [DATA1, null],
        optDecimal128: [Decimal128.fromString("1"), null],
        optObjectId: [new ObjectId("0000002a9a7969d24bea4cf2"), null],
        optUuid: [new UUID("a4078b20-7b0c-4de4-929c-4cc1c7d8345f"), null],
      });
    });

    TestCase.assertEqual(obj.arrayCol[0].doubleCol, 3);
    TestCase.assertEqual(obj.arrayCol[1].doubleCol, 4);
    TestCase.assertEqual(obj.arrayCol[2], undefined);
    TestCase.assertEqual(obj.arrayCol[-1], undefined);
    TestCase.assertEqual(obj.arrayCol[""], undefined);
    TestCase.assertEqual(obj.arrayCol["foo"], undefined);

    TestCase.assertEqual(obj.arrayCol1[0].doubleCol, 5);
    TestCase.assertEqual(obj.arrayCol1[1].doubleCol, 6);
    TestCase.assertEqual(obj.arrayCol1[2], undefined);
    TestCase.assertEqual(obj.arrayCol1[-1], undefined);
    TestCase.assertEqual(obj.arrayCol1[""], undefined);
    TestCase.assertEqual(obj.arrayCol1["foo"], undefined);

    for (let field of prim.keys()) {
      TestCase.assertEqual(prim[field][2], undefined);
      TestCase.assertEqual(prim[field][-1], undefined);
      TestCase.assertEqual(prim[field]["foo"], undefined);
      if (field.includes("opt")) {
        TestCase.assertEqual(prim[field][1], null, `FIELD: ${field}`);
      }
    }

    TestCase.assertSimilar("bool", prim.bool[0], true);
    TestCase.assertSimilar("bool", prim.bool[1], false);
    TestCase.assertSimilar("int", prim.int[0], 1);
    TestCase.assertSimilar("int", prim.int[1], 2);
    TestCase.assertSimilar("float", prim.float[0], 1.1);
    TestCase.assertSimilar("float", prim.float[1], 2.2);
    TestCase.assertSimilar("double", prim.double[0], 1.11);
    TestCase.assertSimilar("double", prim.double[1], 2.22);
    TestCase.assertSimilar("string", prim.string[0], "a");
    TestCase.assertSimilar("string", prim.string[1], "b");
    TestCase.assertSimilar("data", prim.data[0], DATA1);
    TestCase.assertSimilar("data", prim.data[1], DATA2);
    TestCase.assertSimilar("date", prim.date[0], new Date(1));
    TestCase.assertSimilar("date", prim.date[1], new Date(2));
    TestCase.assertSimilar("decimal128", prim.decimal128[0], Decimal128.fromString("1"));
    TestCase.assertSimilar("decimal128", prim.decimal128[1], Decimal128.fromString("2"));
    TestCase.assertSimilar("objectId", prim.objectId[0], new ObjectId("0000002a9a7969d24bea4cf2"));
    TestCase.assertSimilar("objectId", prim.objectId[1], new ObjectId("0000002a9a7969d24bea4cf3"));
    TestCase.assertSimilar("uuid", prim.uuid[0], new UUID("a4078b20-7b0c-4de4-929c-4cc1c7d8345f"));
    TestCase.assertSimilar("uuid", prim.uuid[1], new UUID("b7821fd0-38cf-4f94-8650-d0f5b6295ef4"));

    TestCase.assertSimilar("bool", prim.optBool[0], true);
    TestCase.assertSimilar("int", prim.optInt[0], 1);
    TestCase.assertSimilar("float", prim.optFloat[0], 1.1);
    TestCase.assertSimilar("double", prim.optDouble[0], 1.11);
    TestCase.assertSimilar("string", prim.optString[0], "a");
    TestCase.assertSimilar("data", prim.optData[0], DATA1);
    TestCase.assertSimilar("date", prim.optDate[0], new Date(1));
    TestCase.assertSimilar("decimal128", prim.optDecimal128[0], Decimal128.fromString("1"));
    TestCase.assertNull(prim.optDecimal128[1]);
    TestCase.assertSimilar("objectId", prim.optObjectId[0], new ObjectId("0000002a9a7969d24bea4cf2"));
    TestCase.assertNull(prim.optObjectId[1]);
    TestCase.assertSimilar("uuid", prim.optUuid[0], new UUID("a4078b20-7b0c-4de4-929c-4cc1c7d8345f"));
    TestCase.assertNull(prim.optUuid[1]);
  },

  testListSubscriptSetters: function () {
    const realm = new Realm({ schema: [schemas.LinkTypes, schemas.TestObject, schemas.PrimitiveArrays] });
    let array;

    realm.write(() => {
      let obj = realm.create("LinkTypesObject", {
        objectCol: { doubleCol: 1 },
        objectCol1: { doubleCol: 2 },
        arrayCol: [{ doubleCol: 3 }, { doubleCol: 4 }],
      });
      let prim = realm.create("PrimitiveArrays", {});
      array = obj.arrayCol;

      array[0] = { doubleCol: 5 };
      array[1] = { doubleCol: 6 };
      TestCase.assertEqual(array[0].doubleCol, 5);
      TestCase.assertEqual(array[1].doubleCol, 6);

      array[0] = obj.objectCol;
      array[1] = obj.objectCol1;
      TestCase.assertEqual(array[0].doubleCol, 1);
      TestCase.assertEqual(array[1].doubleCol, 2);

      TestCase.assertThrowsContaining(() => (array[0] = null), "JS value must be of type 'object', got (null)");
      TestCase.assertThrowsContaining(() => (array[0] = {}), "Missing value for property 'TestObject.doubleCol'");
      TestCase.assertThrowsContaining(
        () => (array[0] = { foo: "bar" }),
        "Missing value for property 'TestObject.doubleCol'",
      );
      TestCase.assertThrowsContaining(
        () => (array[0] = prim),
        "Object of type (PrimitiveArrays) does not match List type (TestObject)",
      );
      TestCase.assertThrowsContaining(() => (array[0] = array), "Missing value for property 'TestObject.doubleCol'");
      TestCase.assertThrowsContaining(() => (array[2] = { doubleCol: 1 }), "Requested index 2 greater than max 1");
      TestCase.assertThrowsContaining(() => (array[-1] = { doubleCol: 1 }), "Index -1 cannot be less than zero.");

      array["foo"] = "bar";
      TestCase.assertEqual(array.foo, "bar");

      function testAssign(name, v1, v2) {
        prim[name].push(v1);
        TestCase.assertSimilar(prim[name].type, prim[name][0], v1, undefined, 1);
        prim[name][0] = v2;
        TestCase.assertSimilar(prim[name].type, prim[name][0], v2, undefined, 1);
      }

      testAssign("bool", true, false);
      testAssign("int", 1, 2);
      testAssign("float", 1.1, 2.2);
      testAssign("double", 1.1, 2.2);
      testAssign("string", "a", "b");
      testAssign("data", DATA1, DATA2);
      testAssign("date", DATE1, DATE2);

      function testAssignNull(name, expected) {
        TestCase.assertThrowsContaining(
          () => (prim[name][0] = null),
          `Property must be of type '${expected}', got (null)`,
          undefined,
          1,
        );
      }

      testAssignNull("bool", "bool");
      testAssignNull("int", "int");
      testAssignNull("float", "float");
      testAssignNull("double", "double");
      testAssignNull("string", "string");
      testAssignNull("data", "data");
      testAssignNull("date", "date");

      testAssign("optBool", true, null);
      testAssign("optInt", 1, null);
      testAssign("optFloat", 1.1, null);
      testAssign("optDouble", 1.1, null);
      testAssign("optString", "a", null);
      testAssign("optData", DATA1, null);
      testAssign("optDate", DATE1, null);
    });

    TestCase.assertThrowsContaining(
      () => (array[0] = { doubleCol: 1 }),
      "Cannot modify managed objects outside of a write transaction.",
    );

    array["foo"] = "baz";
    TestCase.assertEqual(array.foo, "baz");
  },

  testListAssignment: function () {
    const realm = new Realm({
      schema: [
        schemas.LinkTypes,
        schemas.TestObject,
        schemas.PersonList,
        schemas.PersonObject,
        schemas.PrimitiveArrays,
      ],
    });

    let obj, prim;
    realm.write(() => {
      obj = realm.create("LinkTypesObject", {});
      prim = realm.create("PrimitiveArrays", {});
      let person = realm.create("PersonObject", { name: "a", age: 2.0 });
      let personList = realm.create("PersonList", { list: [person] }).list;

      TestCase.assertThrowsContaining(() => (obj.arrayCol = [0]), "JS value must be of type 'object', got (0)");
      TestCase.assertThrowsContaining(() => (obj.arrayCol = [null]), "JS value must be of type 'object', got (null)");
      TestCase.assertThrowsContaining(
        () => (obj.arrayCol = [person]),
        "Object of type (PersonObject) does not match List type (TestObject)",
      );
      TestCase.assertThrowsContaining(
        () => (obj.arrayCol = personList),
        "LinkTypesObject.arrayCol must be of type 'TestObject[]', got 'object' (",
      );
      obj.arrayCol = [realm.create("TestObject", { doubleCol: 1.0 })];
      TestCase.assertEqual(obj.arrayCol[0].doubleCol, 1.0);
      obj.arrayCol = obj.arrayCol; // eslint-disable-line no-self-assign
      TestCase.assertEqual(obj.arrayCol[0].doubleCol, 1.0);

      TestCase.assertThrowsContaining(
        () => (prim.bool = [person]),
        "PrimitiveArrays.bool must be of type 'boolean[]', got 'object' ([PersonObject{",
      );
      TestCase.assertThrowsContaining(
        () => (prim.int = [person]),
        "PrimitiveArrays.int must be of type 'number[]', got 'object' ([PersonObject{",
      );
      TestCase.assertThrowsContaining(
        () => (prim.float = [person]),
        "PrimitiveArrays.float must be of type 'number[]', got 'object' ([PersonObject{",
      );
      TestCase.assertThrowsContaining(
        () => (prim.double = [person]),
        "PrimitiveArrays.double must be of type 'number[]', got 'object' ([PersonObject{",
      );
      TestCase.assertThrowsContaining(
        () => (prim.string = [person]),
        "PrimitiveArrays.string must be of type 'string[]', got 'object' ([PersonObject{",
      );
      TestCase.assertThrowsContaining(
        () => (prim.data = [person]),
        "PrimitiveArrays.data must be of type 'binary[]', got 'object' ([PersonObject{",
      );
      TestCase.assertThrowsContaining(
        () => (prim.date = [person]),
        "PrimitiveArrays.date must be of type 'date[]', got 'object' ([PersonObject{",
      );
      TestCase.assertThrowsContaining(
        () => (prim.optBool = [person]),
        "PrimitiveArrays.optBool must be of type 'boolean?[]', got 'object' ([PersonObject{",
      );
      TestCase.assertThrowsContaining(
        () => (prim.optInt = [person]),
        "PrimitiveArrays.optInt must be of type 'number?[]', got 'object' ([PersonObject{",
      );
      TestCase.assertThrowsContaining(
        () => (prim.optFloat = [person]),
        "PrimitiveArrays.optFloat must be of type 'number?[]', got 'object' ([PersonObject{",
      );
      TestCase.assertThrowsContaining(
        () => (prim.optDouble = [person]),
        "PrimitiveArrays.optDouble must be of type 'number?[]', got 'object' ([PersonObject{",
      );
      TestCase.assertThrowsContaining(
        () => (prim.optString = [person]),
        "PrimitiveArrays.optString must be of type 'string?[]', got 'object' ([PersonObject{",
      );
      TestCase.assertThrowsContaining(
        () => (prim.optData = [person]),
        "PrimitiveArrays.optData must be of type 'binary?[]', got 'object' ([PersonObject{",
      );
      TestCase.assertThrowsContaining(
        () => (prim.optDate = [person]),
        "PrimitiveArrays.optDate must be of type 'date?[]', got 'object' ([PersonObject{",
      );

      function testAssign(name, value) {
        prim[name] = [value];
        TestCase.assertSimilar(prim[name].type, prim[name][0], value, undefined, 1);
      }

      testAssign("bool", true);
      testAssign("int", 1);
      testAssign("float", 1.1);
      testAssign("double", 1.1);
      testAssign("string", "a");
      testAssign("data", DATA1);
      testAssign("date", DATE1);

      function testAssignNull(name, expected) {
        TestCase.assertThrowsContaining(
          () => (prim[name] = [null]),
          `PrimitiveArrays.${name} must be of type '${expected}[]', got 'object' ([null])`,
          undefined,
          1,
        );
        TestCase.assertEqual(prim[name].length, 1, "List should not have been cleared by invalid assignment", 1);
      }

      testAssignNull("bool", "boolean");
      testAssignNull("int", "number");
      testAssignNull("float", "number");
      testAssignNull("double", "number");
      testAssignNull("string", "string");
      testAssignNull("data", "binary");
      testAssignNull("date", "date");

      testAssign("optBool", true);
      testAssign("optInt", 1);
      testAssign("optFloat", 1.1);
      testAssign("optDouble", 1.1);
      testAssign("optString", "a");
      testAssign("optData", DATA1);
      testAssign("optDate", DATE1);

      testAssign("optBool", null);
      testAssign("optInt", null);
      testAssign("optFloat", null);
      testAssign("optDouble", null);
      testAssign("optString", null);
      testAssign("optData", null);
      testAssign("optDate", null);
    });

    TestCase.assertThrowsContaining(
      () => (obj.arrayCol = []),
      "Cannot modify managed objects outside of a write transaction.",
    );
    TestCase.assertThrowsContaining(
      () => (prim.bool = []),
      "Cannot modify managed objects outside of a write transaction.",
    );
  },

  testListEnumerate: function () {
    const realm = new Realm({ schema: [schemas.LinkTypes, schemas.TestObject] });
    let obj;

    realm.write(() => {
      obj = realm.create("LinkTypesObject", {
        objectCol: { doubleCol: 1 },
        objectCol1: { doubleCol: 2 },
        arrayCol: [],
      });
    });

    for (const index in obj.arrayCol) {
      TestCase.assertTrue(false, "No objects should have been enumerated: " + index);
    }

    realm.write(() => {
      obj.arrayCol = [{ doubleCol: 0 }, { doubleCol: 1 }];
    });
    TestCase.assertEqual(obj.arrayCol.length, 2);

    let count = 0;
    let keys = Object.keys(obj.arrayCol);
    for (const index in obj.arrayCol) {
      TestCase.assertEqual(count++, +index);
      TestCase.assertEqual(keys[index], index);
    }

    TestCase.assertEqual(count, 2);
    TestCase.assertEqual(keys.length, 2);
  },

  testListPush: function () {
    const realm = new Realm({ schema: [schemas.LinkTypes, schemas.TestObject] });
    let array;

    realm.write(() => {
      let obj = realm.create("LinkTypesObject", {
        objectCol: { doubleCol: 1 },
        objectCol1: { doubleCol: 2 },
        arrayCol: [{ doubleCol: 3 }],
      });

      array = obj.arrayCol;
      TestCase.assertEqual(array.length, 1);

      TestCase.assertEqual(array.push({ doubleCol: 4 }), 2);
      TestCase.assertEqual(array.length, 2);
      TestCase.assertEqual(array[1].doubleCol, 4);

      TestCase.assertEqual(array.push(obj.objectCol, obj.objectCol1), 4);
      TestCase.assertEqual(array.length, 4);
      TestCase.assertEqual(array[2].doubleCol, 1);
      TestCase.assertEqual(array[3].doubleCol, 2);

      TestCase.assertEqual(array.push(), 4);
      TestCase.assertEqual(array.length, 4);
    });

    TestCase.assertEqual(array.length, 4);
    TestCase.assertThrowsContaining(() => {
      array.push([1]);
    }, "Cannot modify managed objects outside of a write transaction.");
  },

  testListPop: function () {
    const realm = new Realm({ schema: [schemas.LinkTypes, schemas.TestObject] });
    let array;

    realm.write(() => {
      let obj = realm.create("LinkTypesObject", {
        objectCol: { doubleCol: 1 },
        objectCol1: { doubleCol: 2 },
        arrayCol: [{ doubleCol: 3 }, { doubleCol: 4 }],
      });

      array = obj.arrayCol;
      TestCase.assertEqual(array.pop().doubleCol, 4);
      TestCase.assertEqual(array.pop().doubleCol, 3);
      TestCase.assertEqual(array.length, 0);

      TestCase.assertEqual(array.pop(), undefined);

      TestCase.assertThrowsContaining(() => array.pop(1), "Invalid argument");
    });

    TestCase.assertThrowsContaining(() => array.pop(), "Cannot modify managed objects outside of a write transaction.");
  },

  testListUnshift: function () {
    const realm = new Realm({ schema: [schemas.LinkTypes, schemas.TestObject] });
    let array;

    realm.write(() => {
      let obj = realm.create("LinkTypesObject", {
        objectCol: { doubleCol: 1 },
        objectCol1: { doubleCol: 2 },
        arrayCol: [{ doubleCol: 3 }],
      });

      array = obj.arrayCol;
      TestCase.assertEqual(array.length, 1);

      TestCase.assertEqual(array.unshift({ doubleCol: 5 }), 2);
      TestCase.assertEqual(array.length, 2);
      TestCase.assertEqual(array[0].doubleCol, 5);

      TestCase.assertEqual(array.unshift(obj.objectCol, obj.objectCol1), 4);
      TestCase.assertEqual(array.length, 4);
      TestCase.assertEqual(array[0].doubleCol, 1);
      TestCase.assertEqual(array[1].doubleCol, 2);

      TestCase.assertEqual(array.unshift(), 4);
      TestCase.assertEqual(array.length, 4);
    });

    TestCase.assertEqual(array.length, 4);
    TestCase.assertThrowsContaining(
      () => array.unshift({ doubleCol: 1 }),
      "Cannot modify managed objects outside of a write transaction.",
    );
  },

  testListShift: function () {
    const realm = new Realm({ schema: [schemas.LinkTypes, schemas.TestObject] });
    let array;

    realm.write(() => {
      let obj = realm.create("LinkTypesObject", {
        objectCol: { doubleCol: 1 },
        objectCol1: { doubleCol: 2 },
        arrayCol: [{ doubleCol: 3 }, { doubleCol: 4 }],
      });

      array = obj.arrayCol;
      TestCase.assertEqual(array.shift().doubleCol, 3);
      TestCase.assertEqual(array.shift().doubleCol, 4);
      TestCase.assertEqual(array.length, 0);

      TestCase.assertEqual(array.shift(), undefined);

      TestCase.assertThrowsContaining(() => array.shift(1), "Invalid argument");
    });

    TestCase.assertThrowsContaining(() => {
      array.shift();
    }, "Cannot modify managed objects outside of a write transaction.");
  },

  testListSplice: function () {
    const realm = new Realm({ schema: [schemas.LinkTypes, schemas.TestObject] });
    let array;

    realm.write(() => {
      let obj = realm.create("LinkTypesObject", {
        objectCol: { doubleCol: 1 },
        objectCol1: { doubleCol: 2 },
        arrayCol: [{ doubleCol: 3 }, { doubleCol: 4 }],
      });

      array = obj.arrayCol;
      let removed;

      removed = array.splice(0, 0, obj.objectCol, obj.objectCol1);
      TestCase.assertEqual(removed.length, 0);
      TestCase.assertEqual(array.length, 4);
      TestCase.assertEqual(array[0].doubleCol, 1);
      TestCase.assertEqual(array[1].doubleCol, 2);

      removed = array.splice(2, 2, { doubleCol: 5 }, { doubleCol: 6 });
      TestCase.assertEqual(removed.length, 2);
      TestCase.assertEqual(removed[0].doubleCol, 3);
      TestCase.assertEqual(removed[1].doubleCol, 4);
      TestCase.assertEqual(array.length, 4);
      TestCase.assertEqual(array[2].doubleCol, 5);
      TestCase.assertEqual(array[3].doubleCol, 6);

      removed = array.splice(2, 2);
      TestCase.assertEqual(removed.length, 2);
      TestCase.assertEqual(removed[0].doubleCol, 5);
      TestCase.assertEqual(removed[1].doubleCol, 6);
      TestCase.assertEqual(array.length, 2);
      TestCase.assertEqual(array[0].doubleCol, 1);
      TestCase.assertEqual(array[1].doubleCol, 2);

      removed = array.splice(-1, 1);
      TestCase.assertEqual(removed.length, 1);
      TestCase.assertEqual(removed[0].doubleCol, 2);
      TestCase.assertEqual(array.length, 1);
      TestCase.assertEqual(array[0].doubleCol, 1);

      removed = array.splice(0, 2);
      TestCase.assertEqual(removed.length, 1);
      TestCase.assertEqual(removed[0].doubleCol, 1);
      TestCase.assertEqual(array.length, 0);

      removed = array.splice("0", "0", obj.objectCol);
      TestCase.assertEqual(removed.length, 0);
      TestCase.assertEqual(array.length, 1);

      removed = array.splice(1);
      TestCase.assertEqual(removed.length, 0);
      TestCase.assertEqual(array.length, 1);

      removed = array.splice(0);
      TestCase.assertEqual(removed.length, 1);
      TestCase.assertEqual(array.length, 0);

      TestCase.assertThrowsContaining(() => {
        array.splice("cat", 1);
      }, "Value 'cat' not convertible to a number");

      TestCase.assertThrowsContaining(() => {
        array.splice(0, 0, 0);
      }, "JS value must be of type 'object', got (0)");
    });

    TestCase.assertThrowsContaining(() => {
      array.splice(0, 0, { doubleCol: 1 });
    }, "Cannot modify managed objects outside of a write transaction");
  },

  testListDeletions: function () {
    const realm = new Realm({ schema: [schemas.LinkTypes, schemas.TestObject] });
    let object;
    let array;

    realm.write(() => {
      object = realm.create("LinkTypesObject", {
        objectCol: { doubleCol: 1 },
        objectCol1: { doubleCol: 2 },
        arrayCol: [{ doubleCol: 3 }, { doubleCol: 4 }],
      });

      array = object.arrayCol;
    });

    try {
      realm.write(() => {
        realm.delete(array[0]);
        TestCase.assertEqual(array.length, 1);
        TestCase.assertEqual(array[0].doubleCol, 4);

        // This should cancel the transaction and cause the list to be reset.
        throw new Error("Transaction FAIL");
      });
    } catch (e) {
      // Speech is silver, silence is golden
    }

    TestCase.assertEqual(array.length, 2);
    TestCase.assertEqual(array[0].doubleCol, 3);

    realm.write(() => {
      realm.delete(object);
    });

    TestCase.assertThrowsContaining(() => array[0], "invalidated");
  },

  testLiveUpdatingResults: function () {
    const realm = new Realm({ schema: [schemas.LinkTypes, schemas.TestObject] });
    let objects = realm.objects("TestObject");
    let array;

    realm.write(() => {
      let obj = realm.create("LinkTypesObject", {
        objectCol: { doubleCol: 1 },
        objectCol1: { doubleCol: 2 },
        arrayCol: [{ doubleCol: 3 }, { doubleCol: 4 }],
      });

      array = obj.arrayCol;
    });

    TestCase.assertEqual(array.length, 2);
    TestCase.assertEqual(objects.length, 4);

    try {
      realm.write(() => {
        array.push({ doubleCol: 5 });
        TestCase.assertEqual(objects.length, 5);

        array.unshift({ doubleCol: 2 });
        TestCase.assertEqual(objects.length, 6);

        array.splice(0, 0, { doubleCol: 1 });
        TestCase.assertEqual(objects.length, 7);

        array.push(objects[0], objects[1]);
        TestCase.assertEqual(objects.length, 7);

        // This should cancel the transaction and cause the list and results to be reset.
        throw new Error("Transaction FAIL");
      });
    } catch (e) {
      // Speech is silver, silence is golden
    }

    TestCase.assertEqual(array.length, 2);
    TestCase.assertEqual(objects.length, 4);
  },

  testListSnapshot: function () {
    const realm = new Realm({ schema: [schemas.LinkTypes, schemas.TestObject] });
    let objects = realm.objects("TestObject");
    let array;

    realm.write(() => {
      let obj = realm.create("LinkTypesObject", [[1], [2], [[3], [4]], [[5], [6]]]);
      array = obj.arrayCol;
    });

    let objectsCopy = objects.snapshot();
    let arrayCopy = array.snapshot();

    TestCase.assertEqual(objectsCopy.length, 6);
    TestCase.assertEqual(arrayCopy.length, 2);

    realm.write(() => {
      array.push([5]);
      TestCase.assertEqual(objectsCopy.length, 6);
      TestCase.assertEqual(arrayCopy.length, 2);

      TestCase.assertEqual(objectsCopy.snapshot().length, 6);
      TestCase.assertEqual(arrayCopy.snapshot().length, 2);

      TestCase.assertEqual(objects.snapshot().length, 7);
      TestCase.assertEqual(array.snapshot().length, 3);

      realm.delete(array[0]);
      TestCase.assertEqual(objectsCopy.length, 6);
      TestCase.assertEqual(arrayCopy.length, 2);
      TestCase.assertEqual(arrayCopy[0], null);

      realm.deleteAll();
      TestCase.assertEqual(objectsCopy.length, 6);
      TestCase.assertEqual(arrayCopy.length, 2);
      TestCase.assertEqual(arrayCopy[1], null);
    });
  },

  testListFiltered: function () {
    const realm = new Realm({ schema: [schemas.PersonObject, schemas.PersonList] });
    let list;

    realm.write(() => {
      let object = realm.create("PersonList", {
        list: [
          { name: "Ari", age: 10 },
          { name: "Tim", age: 11 },
          { name: "Bjarne", age: 12 },
          { name: "Alex", age: 12, married: true },
        ],
      });
      realm.create("PersonObject", { name: "NotInList", age: 10 });

      list = object.list;
    });

    TestCase.assertEqual(list.filtered("truepredicate").length, 4);
    TestCase.assertEqual(list.filtered("age = 11")[0].name, "Tim");
    TestCase.assertEqual(list.filtered("age = 12").length, 2);
    TestCase.assertEqual(list.filtered("age > 10 && age < 13").length, 3);
    TestCase.assertEqual(list.filtered("age > 10").filtered("age < 13").length, 3);
  },

  testUuidListFiltered: function () {
    const schema = {
      name: "PrimUuidListsObject",
      primaryKey: "_id",
      properties: {
        _id: "uuid",
        list: "uuid[]",
      },
    };
    const realm = new Realm({ schema: [schema] });

    realm.write(() => {
      realm.create(schema.name, {
        _id: new UUID("afe99de1-c52a-4c6d-8d5a-b9df38d61b41"),
        list: [
          new UUID("64ecbcf8-0738-4451-87cb-bb38562f2377"),
          new UUID("06dbb9ee-8516-467a-9e1d-23d03d704537"),
          new UUID("f6f41949-d27e-48c0-a391-c74f0498c5e6"),
        ],
      });
      realm.create(schema.name, {
        _id: new UUID("bd2050e8-f01c-4459-90d0-d16af35b9edc"),
        list: [
          new UUID("701fee43-e77b-4ab4-8224-0e0d8cedaafd"),
          new UUID("adbb2635-b61b-4a59-8f03-e97e847a5a14"),
          new UUID("f8aed1db-5b59-4f0f-9c9c-b48ea3cab73f"),
          new UUID("f9a9ab69-c04d-4b1c-b96b-27f829505704"),
          new UUID("5184ccf4-40f1-4748-a089-f64de6376907"),
        ],
      });
    });

    const listCountHit5 = realm.objects(schema.name).filtered("list.@count == 5");
    TestCase.assertEqual(listCountHit5.length, 1, "'list.@count == 5' should only find one item");
    TestCase.assertEqual(listCountHit5[0]._id.toString(), "bd2050e8-f01c-4459-90d0-d16af35b9edc");

    const listDeepFilter = realm
      .objects(schema.name)
      .filtered("ANY list == $0", new UUID("64ecbcf8-0738-4451-87cb-bb38562f2377"));
    TestCase.assertEqual(
      listDeepFilter.length,
      1,
      "'ANY list == uuid(64ecbcf8-0738-4451-87cb-bb38562f2377)' should only find one item",
    );
    TestCase.assertEqual(listDeepFilter[0]._id.toString(), "afe99de1-c52a-4c6d-8d5a-b9df38d61b41");
  },

  testListSorted: function () {
    const schema = [
      { name: "Target", properties: { value: "int" } },
      { name: "Mid", properties: { value: "int", link: "Target" } },
      { name: "List", properties: { list: { type: "list", objectType: "Mid" } } },
      schemas.PrimitiveArrays,
    ];
    const realm = new Realm({ schema: schema });

    let list, prim;
    realm.write(() => {
      list = realm.create("List", {
        list: [
          { value: 3, link: { value: 1 } },
          { value: 1, link: { value: 3 } },
          { value: 2, link: { value: 2 } },
        ],
      }).list;
      realm.create("List", { list: [{ value: 4, link: { value: 4 } }] });
      prim = realm.create("PrimitiveArrays", {
        bool: [true, false],
        int: [3, 1, 2],
        float: [3, 1, 2],
        double: [3, 1, 2],
        string: ["c", "a", "b"],
        data: [DATA3, DATA1, DATA2],
        date: [DATE3, DATE1, DATE2],
        objectId: [
          new ObjectId("0000002a9a7969d24bea4cf2"),
          new ObjectId("0000002a9a7969d24bea4cf3"),
          new ObjectId("0000002a9a7969d24bea4cf4"),
        ],
        uuid: [
          new UUID("a4078b20-7b0c-4de4-929c-4cc1c7d8345f"),
          new UUID("c16d38bf-28f2-4a3a-9817-e0f45ffce68a"),
          new UUID("b7821fd0-38cf-4f94-8650-d0f5b6295ef4"),
        ],
        optBool: [true, false, null],
        optInt: [3, 1, 2, null],
        optFloat: [3, 1, 2, null],
        optDouble: [3, 1, 2, null],
        optString: ["c", "a", "b", null],
        optData: [DATA3, DATA1, DATA2, null],
        optDate: [DATE3, DATE1, DATE2, null],
        optObjectId: [
          new ObjectId("0000002a9a7969d24bea4cf2"),
          new ObjectId("0000002a9a7969d24bea4cf4"),
          new ObjectId("0000002a9a7969d24bea4cf3"),
          null,
        ],
        optUuid: [
          new UUID("a4078b20-7b0c-4de4-929c-4cc1c7d8345f"),
          new UUID("c16d38bf-28f2-4a3a-9817-e0f45ffce68a"),
          new UUID("b7821fd0-38cf-4f94-8650-d0f5b6295ef4"),
          null,
        ],
      });
    });

    const values = (results) => results.map((o) => o.value);

    // TestCase.assertThrowsContaining(() => list.sorted());
    TestCase.assertThrowsContaining(
      () => list.sorted("nonexistent property"),
      "Cannot sort on key path 'nonexistent property': property 'Mid.nonexistent property' does not exist.",
    );
    TestCase.assertThrowsContaining(
      () => list.sorted("link"),
      "Cannot sort on key path 'link': property 'Mid.link' of type 'object' cannot be the final property in the key path.",
    );

    TestCase.assertArraysEqual(values(list.sorted([])), [3, 1, 2]);

    TestCase.assertArraysEqual(values(list.sorted("value")), [1, 2, 3]);
    TestCase.assertArraysEqual(values(list.sorted("value", false)), [1, 2, 3]);
    TestCase.assertArraysEqual(values(list.sorted("value", true)), [3, 2, 1]);
    TestCase.assertArraysEqual(values(list.sorted(["value"])), [1, 2, 3]);
    TestCase.assertArraysEqual(values(list.sorted([["value", false]])), [1, 2, 3]);
    TestCase.assertArraysEqual(values(list.sorted([["value", true]])), [3, 2, 1]);

    TestCase.assertArraysEqual(values(list.sorted("link.value")), [3, 2, 1]);
    TestCase.assertArraysEqual(values(list.sorted("link.value", false)), [3, 2, 1]);
    TestCase.assertArraysEqual(values(list.sorted("link.value", true)), [1, 2, 3]);
    TestCase.assertArraysEqual(values(list.sorted(["link.value"])), [3, 2, 1]);
    TestCase.assertArraysEqual(values(list.sorted([["link.value", false]])), [3, 2, 1]);
    TestCase.assertArraysEqual(values(list.sorted([["link.value", true]])), [1, 2, 3]);

    TestCase.assertThrowsContaining(
      () => prim.int.sorted("value", true),
      "Cannot sort on key path 'value': arrays of 'int' can only be sorted on 'self'",
    );
    TestCase.assertThrowsContaining(
      () => prim.int.sorted("!ARRAY_VALUE", true),
      "Cannot sort on key path '!ARRAY_VALUE': arrays of 'int' can only be sorted on 'self'",
    );

    TestCase.assertArraysEqual(prim.int.sorted([]), [3, 1, 2]);
    TestCase.assertArraysEqual(prim.int.sorted(), [1, 2, 3]);
    TestCase.assertArraysEqual(prim.int.sorted(false), [1, 2, 3]);
    TestCase.assertArraysEqual(prim.int.sorted(true), [3, 2, 1]);

    TestCase.assertArraysEqual(prim.optInt.sorted([]), [3, 1, 2, null]);
    TestCase.assertArraysEqual(prim.optInt.sorted(), [null, 1, 2, 3]);
    TestCase.assertArraysEqual(prim.optInt.sorted(false), [null, 1, 2, 3]);
    TestCase.assertArraysEqual(prim.optInt.sorted(true), [3, 2, 1, null]);

    TestCase.assertArraysEqual(prim.bool.sorted(), [false, true]);
    TestCase.assertArraysEqual(prim.float.sorted(), [1, 2, 3]);
    TestCase.assertArraysEqual(prim.double.sorted(), [1, 2, 3]);
    TestCase.assertArraysEqual(prim.string.sorted(), ["a", "b", "c"]);
    TestCase.assertArraysEqual(prim.data.sorted(), [DATA1, DATA2, DATA3]);
    TestCase.assertArraysEqual(prim.date.sorted(), [DATE1, DATE2, DATE3]);
    TestCase.assertArraysEqual(prim.optBool.sorted(), [null, false, true]);
    TestCase.assertArraysEqual(prim.optFloat.sorted(), [null, 1, 2, 3]);
    TestCase.assertArraysEqual(prim.optDouble.sorted(), [null, 1, 2, 3]);
    TestCase.assertArraysEqual(prim.optString.sorted(), [null, "a", "b", "c"]);
    TestCase.assertArraysEqual(prim.optData.sorted(), [null, DATA1, DATA2, DATA3]);
    TestCase.assertArraysEqual(prim.optDate.sorted(), [null, DATE1, DATE2, DATE3]);

    TestCase.assertArraysEqual(prim.objectId.sorted(), [
      new ObjectId("0000002a9a7969d24bea4cf2"),
      new ObjectId("0000002a9a7969d24bea4cf3"),
      new ObjectId("0000002a9a7969d24bea4cf4"),
    ]);
    TestCase.assertArraysEqual(prim.objectId.sorted(true), [
      new ObjectId("0000002a9a7969d24bea4cf4"),
      new ObjectId("0000002a9a7969d24bea4cf3"),
      new ObjectId("0000002a9a7969d24bea4cf2"),
    ]);

    TestCase.assertArraysEqual(prim.uuid.sorted(), [
      new UUID("a4078b20-7b0c-4de4-929c-4cc1c7d8345f"),
      new UUID("b7821fd0-38cf-4f94-8650-d0f5b6295ef4"),
      new UUID("c16d38bf-28f2-4a3a-9817-e0f45ffce68a"),
    ]);
    TestCase.assertArraysEqual(prim.uuid.sorted(true), [
      new UUID("c16d38bf-28f2-4a3a-9817-e0f45ffce68a"),
      new UUID("b7821fd0-38cf-4f94-8650-d0f5b6295ef4"),
      new UUID("a4078b20-7b0c-4de4-929c-4cc1c7d8345f"),
    ]);

    TestCase.assertArraysEqual(prim.optObjectId.sorted(), [
      null,
      new ObjectId("0000002a9a7969d24bea4cf2"),
      new ObjectId("0000002a9a7969d24bea4cf3"),
      new ObjectId("0000002a9a7969d24bea4cf4"),
    ]);
    TestCase.assertArraysEqual(prim.optObjectId.sorted(true), [
      new ObjectId("0000002a9a7969d24bea4cf4"),
      new ObjectId("0000002a9a7969d24bea4cf3"),
      new ObjectId("0000002a9a7969d24bea4cf2"),
      null,
    ]);

    TestCase.assertArraysEqual(prim.optUuid.sorted(), [
      null,
      new UUID("a4078b20-7b0c-4de4-929c-4cc1c7d8345f"),
      new UUID("b7821fd0-38cf-4f94-8650-d0f5b6295ef4"),
      new UUID("c16d38bf-28f2-4a3a-9817-e0f45ffce68a"),
    ]);
    TestCase.assertArraysEqual(prim.optUuid.sorted(true), [
      new UUID("c16d38bf-28f2-4a3a-9817-e0f45ffce68a"),
      new UUID("b7821fd0-38cf-4f94-8650-d0f5b6295ef4"),
      new UUID("a4078b20-7b0c-4de4-929c-4cc1c7d8345f"),
      null,
    ]);
  },

  testArrayMethods: function () {
    const realm = new Realm({ schema: [schemas.PersonObject, schemas.PersonList, schemas.PrimitiveArrays] });
    let object, prim;

    realm.write(() => {
      object = realm.create("PersonList", {
        list: [
          { name: "Ari", age: 10 },
          { name: "Tim", age: 11 },
          { name: "Bjarne", age: 12 },
        ],
      });
      prim = realm.create("PrimitiveArrays", { int: [10, 11, 12] });
    });

    for (const list of [object.list, realm.objects("PersonObject")]) {
      TestCase.assertEqual(list.slice().length, 3);
      TestCase.assertEqual(list.slice(-1).length, 1);
      TestCase.assertEqual(list.slice(-1)[0].age, 12);
      TestCase.assertEqual(list.slice(1, 3).length, 2);
      TestCase.assertEqual(list.slice(1, 3)[1].age, 12);
      TestCase.assertEqual(list.join(" "), "Ari Tim Bjarne");

      let count = 0;
      list.forEach((p, i) => {
        TestCase.assertEqual(p.name, list[i].name);
        count++;
      });
      TestCase.assertEqual(count, list.length);

      TestCase.assertArraysEqual(
        list.map((p) => p.age),
        [10, 11, 12],
      );
      TestCase.assertTrue(list.some((p) => p.age > 10));
      TestCase.assertTrue(list.every((p) => p.age > 0));

      let person = list.find((p) => p.name == "Tim");
      TestCase.assertEqual(person.name, "Tim");

      let index = list.findIndex((p) => p.name == "Tim");
      TestCase.assertEqual(index, 1);
      TestCase.assertEqual(list.indexOf(list[index]), index);

      TestCase.assertEqual(
        list.reduce((n, p) => n + p.age, 0),
        33,
      );
      TestCase.assertEqual(
        list.reduceRight((n, p) => n + p.age, 0),
        33,
      );

      // eslint-disable-next-line no-undef
      let iteratorMethodNames = ["entries", "keys", "values"];

      iteratorMethodNames.push(Symbol.iterator);

      iteratorMethodNames.forEach((methodName) => {
        let iterator = list[methodName]();
        let count = 0;
        let result;

        // This iterator should itself be iterable.
        // TestCase.assertEqual(iterator[iteratorSymbol](), iterator);
        TestCase.assertEqual(iterator[Symbol.iterator](), iterator);

        while ((result = iterator.next()) && !result.done) {
          let value = result.value;

          switch (methodName) {
            case "entries":
              TestCase.assertEqual(value.length, 2);
              TestCase.assertEqual(value[0], count);
              TestCase.assertEqual(value[1].name, list[count].name);
              break;
            case "keys":
              TestCase.assertEqual(value, count);
              break;
            default:
              TestCase.assertEqual(value.name, list[count].name);
              break;
          }

          count++;
        }

        TestCase.assertEqual(result.done, true);
        TestCase.assertEqual(result.value, undefined);
        TestCase.assertEqual(count, list.length);
      });
    }

    const list = prim.int;
    TestCase.assertEqual(list.slice().length, 3);
    TestCase.assertEqual(list.slice(-1).length, 1);
    TestCase.assertEqual(list.slice(-1)[0], 12);
    TestCase.assertEqual(list.slice(1, 3).length, 2);
    TestCase.assertEqual(list.slice(1, 3)[1], 12);

    TestCase.assertEqual(list.join(" "), "10 11 12");

    let count = 0;
    list.forEach((v, i) => {
      TestCase.assertEqual(v, i + 10);
      count++;
    });
    TestCase.assertEqual(count, list.length);

    TestCase.assertArraysEqual(
      list.map((p) => p + 1),
      [11, 12, 13],
    );
    TestCase.assertTrue(list.some((p) => p > 10));
    TestCase.assertTrue(list.every((p) => p > 0));

    let value = list.find((p) => p == 11);
    TestCase.assertEqual(value, 11);

    let index = list.findIndex((p) => p == 11);
    TestCase.assertEqual(index, 1);
    TestCase.assertEqual(list.indexOf(list[index]), index);

    TestCase.assertEqual(
      list.reduce((n, p) => n + p, 0),
      33,
    );
    TestCase.assertEqual(
      list.reduceRight((n, p) => n + p, 0),
      33,
    );

    // eslint-disable-next-line no-undef
    let iteratorMethodNames = ["entries", "keys", "values"];

    iteratorMethodNames.push(Symbol.iterator);

    iteratorMethodNames.forEach((methodName) => {
      let iterator = list[methodName]();
      let count = 0;
      let result;

      // This iterator should itself be iterable.
      // TestCase.assertEqual(iterator[iteratorSymbol](), iterator);
      TestCase.assertEqual(iterator[Symbol.iterator](), iterator);

      while ((result = iterator.next()) && !result.done) {
        let value = result.value;

        switch (methodName) {
          case "entries":
            TestCase.assertEqual(value.length, 2);
            TestCase.assertEqual(value[0], count);
            TestCase.assertEqual(value[1], list[count]);
            break;
          case "keys":
            TestCase.assertEqual(value, count);
            break;
          default:
            TestCase.assertEqual(value.name, list[count].name);
            break;
        }

        count++;
      }

      TestCase.assertEqual(result.done, true);
      TestCase.assertEqual(result.value, undefined);
      TestCase.assertEqual(count, list.length);
    });
  },

  testPagenation: function () {
    const realm = new Realm({ schema: [schemas.StringOnly] });
    realm.write(() => {
      for (let i = 0; i < 10; i++) {
        realm.create(schemas.StringOnly.name, { stringCol: `${i}` });
      }
    });

    let objects = realm.objects(schemas.StringOnly.name);
    let page1 = objects.slice(0, 5);
    let page2 = objects.slice(5, 10);
    TestCase.assertEqual(page1.length, 5);
    TestCase.assertEqual(page2.length, 5);
    for (let i = 0; i < 5; i++) {
      TestCase.assertEqual(page1[i]["stringCol"], `${i}`);
      TestCase.assertEqual(page2[i]["stringCol"], `${i + 5}`);
    }
    realm.close();
  },

  testIsValid: function () {
    const realm = new Realm({ schema: [schemas.PersonObject, schemas.PersonList] });
    let object;
    let list;
    realm.write(() => {
      object = realm.create("PersonList", {
        list: [
          { name: "Ari", age: 10 },
          { name: "Tim", age: 11 },
          { name: "Bjarne", age: 12 },
        ],
      });
      list = object.list;
      TestCase.assertEqual(list.isValid(), true);
      realm.delete(object);
    });

    TestCase.assertEqual(list.isValid(), false);
    TestCase.assertThrowsContaining(() => list.length, "invalidated");
  },

  testIsEmpty: function () {
    const realm = new Realm({ schema: [schemas.PersonObject, schemas.PersonList] });
    let object;
    realm.write(() => {
      object = realm.create("PersonList", {
        list: [],
      });
    });
    TestCase.assertTrue(object.list.isEmpty());

    realm.write(() => {
      object.list = [
        { name: "Bob", age: 42 },
        { name: "Alice", age: 42 },
      ];
    });
    TestCase.assertFalse(object.list.isEmpty());

    realm.close();
  },

  testListAggregateFunctions: function () {
    const NullableBasicTypesList = {
      name: "NullableBasicTypesList",
      properties: {
        list: "NullableBasicTypesObject[]",
      },
    };

    const realm = new Realm({ schema: [schemas.NullableBasicTypes, NullableBasicTypesList] });
    const N = 50;
    const list = [];
    for (let i = 0; i < N; i++) {
      list.push({
        intCol: i + 1,
        floatCol: i + 1,
        doubleCol: i + 1,
        dateCol: new Date(i + 1),
      });
    }

    let object;
    realm.write(() => {
      object = realm.create("NullableBasicTypesList", { list: list });
    });

    TestCase.assertEqual(object.list.length, N);

    // int, float & double columns support all aggregate functions
    ["intCol", "floatCol", "doubleCol"].forEach((colName) => {
      TestCase.assertEqual(object.list.min(colName), 1);
      TestCase.assertEqual(object.list.max(colName), N);
      TestCase.assertEqual(object.list.sum(colName), (N * (N + 1)) / 2);
      TestCase.assertEqual(object.list.avg(colName), (N + 1) / 2);
    });

    // date columns support only 'min' & 'max'
    TestCase.assertEqual(object.list.min("dateCol").getTime(), new Date(1).getTime());
    TestCase.assertEqual(object.list.max("dateCol").getTime(), new Date(N).getTime());
  },

  testListAggregateFunctionsWithNullColumnValues: function () {
    const NullableBasicTypesList = {
      name: "NullableBasicTypesList",
      properties: {
        list: "NullableBasicTypesObject[]",
      },
    };

    const realm = new Realm({ schema: [schemas.NullableBasicTypes, NullableBasicTypesList] });

    const N = 50;
    const M = 10;

    const list = [];
    for (let i = 0; i < N; i++) {
      list.push({
        intCol: i + 1,
        floatCol: i + 1,
        doubleCol: i + 1,
        dateCol: new Date(i + 1),
      });
    }

    for (let j = 0; j < M; j++) {
      list.push({});
    }

    let object, objectEmptyList;
    realm.write(() => {
      object = realm.create("NullableBasicTypesList", { list: list });
      objectEmptyList = realm.create("NullableBasicTypesList", { list: [] });
    });

    TestCase.assertEqual(object.list.length, N + M);

    // int, float & double columns support all aggregate functions
    // the M null valued objects should be ignored
    ["intCol", "floatCol", "doubleCol"].forEach((colName) => {
      TestCase.assertEqual(object.list.min(colName), 1);
      TestCase.assertEqual(object.list.max(colName), N);
      TestCase.assertEqual(object.list.sum(colName), (N * (N + 1)) / 2);
      TestCase.assertEqual(object.list.avg(colName), (N + 1) / 2);
    });

    // date columns support only 'min' & 'max'
    TestCase.assertEqual(object.list.min("dateCol").getTime(), new Date(1).getTime());
    TestCase.assertEqual(object.list.max("dateCol").getTime(), new Date(N).getTime());

    // call aggregate functions on empty list
    TestCase.assertEqual(objectEmptyList.list.length, 0);
    ["intCol", "floatCol", "doubleCol"].forEach((colName) => {
      TestCase.assertUndefined(objectEmptyList.list.min(colName));
      TestCase.assertUndefined(objectEmptyList.list.max(colName));
      TestCase.assertEqual(objectEmptyList.list.sum(colName), 0);
      TestCase.assertUndefined(objectEmptyList.list.avg(colName));
    });

    TestCase.assertUndefined(objectEmptyList.list.min("dateCol"));
    TestCase.assertUndefined(objectEmptyList.list.max("dateCol"));
  },

  testPrimitiveListAggregateFunctions: function () {
    const realm = new Realm({ schema: [schemas.PrimitiveArrays] });
    let object;
    realm.write(() => {
      object = realm.create("PrimitiveArrays", {
        int: [1, 2, 3],
        float: [1.1, 2.2, 3.3],
        double: [1.11, 2.22, 3.33],
        date: [DATE1, DATE2, DATE3],

        optInt: [1, null, 2],
        optFloat: [1.1, null, 3.3],
        optDouble: [1.11, null, 3.33],
        optDate: [DATE1, null, DATE3],
      });
    });

    for (let prop of ["int", "float", "double", "date", "optInt", "optFloat", "optDouble", "optDate"]) {
      const list = object[prop];
      TestCase.assertSimilar(list.type, list.min(), list[0]);
      TestCase.assertSimilar(list.type, list.max(), list[2]);

      if (list.type === "date") {
        TestCase.assertThrowsContaining(() => list.sum(), "Cannot sum 'date' array: operation not supported");
        TestCase.assertThrowsContaining(() => list.avg(), "Cannot avg 'date' array: operation not supported");
        continue;
      }

      const sum = list[0] + list[1] + list[2];
      const avg = sum / (list[1] === null ? 2 : 3);
      TestCase.assertSimilar(list.type, list.sum(), sum);
      TestCase.assertSimilar(list.type, list.avg(), avg);
    }

    TestCase.assertThrowsContaining(() => object.bool.min(), "Cannot min 'bool' array: operation not supported");
    TestCase.assertThrowsContaining(
      () => object.int.min("foo"),
      "Invalid arguments: at most 0 expected, but 1 supplied",
    );
  },

  testPrimitiveListFunctions: function () {
    const realm = new Realm({ schema: [schemas.PrimitiveArrays] });
    realm.write(() => {
      realm.create("PrimitiveArrays", {
        int: [1, 2, 3],
        float: [1.1, 2.2, 3.3],
        double: [1.11, 2.22, 3.33],
        date: [DATE1, DATE2, DATE3],
        string: ["1", "2", "3"],
      });
    });

    let objects = realm.objects("PrimitiveArrays");
    TestCase.assertEqual(objects.length, 1);
    TestCase.assertEqual(objects[0]["string"].length, 3);
    TestCase.assertEqual(objects[0]["string"].join(","), "1,2,3");

    realm.close();
  },

  testListAggregateFunctionsUnsupported: function () {
    const NullableBasicTypesList = {
      name: "NullableBasicTypesList",
      properties: {
        list: { type: "list", objectType: "NullableBasicTypesObject" },
      },
    };

    const realm = new Realm({ schema: [schemas.NullableBasicTypes, NullableBasicTypesList] });

    const N = 5;

    var list = [];
    for (let i = 0; i < N; i++) {
      list.push({
        intCol: i + 1,
        floatCol: i + 1,
        doubleCol: i + 1,
        dateCol: new Date(i + 1),
      });
    }

    let object;
    realm.write(() => {
      object = realm.create("NullableBasicTypesList", { list: list });
    });

    TestCase.assertEqual(object.list.length, N);

    // bool, string & data columns don't support 'min'
    ["bool", "string", "data"].forEach((colName) => {
      TestCase.assertThrowsContaining(
        () => object.list.min(colName + "Col"),
        `Cannot min property '${colName}Col': operation not supported for '${colName}' properties`,
      );
    });

    // bool, string & data columns don't support 'max'
    ["bool", "string", "data"].forEach((colName) => {
      TestCase.assertThrowsContaining(
        () => object.list.max(colName + "Col"),
        `Cannot max property '${colName}Col': operation not supported for '${colName}' properties`,
      );
    });

    // bool, string, date & data columns don't support 'avg'
    ["bool", "string", "date", "data"].forEach((colName) => {
      TestCase.assertThrowsContaining(
        () => object.list.avg(colName + "Col"),
        `Cannot avg property '${colName}Col': operation not supported for '${colName}' properties`,
      );
    });

    // bool, string, date & data columns don't support 'sum'
    ["bool", "string", "date", "data"].forEach((colName) => {
      TestCase.assertThrowsContaining(
        () => object.list.sum(colName + "Col"),
        `Cannot sum property '${colName}Col': operation not supported for '${colName}' properties`,
      );
    });
  },

  testListAggregateFunctionsWrongProperty: function () {
    const realm = new Realm({ schema: [schemas.PersonObject, schemas.PersonList] });
    let object;
    realm.write(() => {
      object = realm.create("PersonList", {
        list: [
          { name: "Ari", age: 10 },
          { name: "Tim", age: 11 },
          { name: "Bjarne", age: 12 },
        ],
      });
    });

    TestCase.assertThrowsContaining(
      () => object.list.min("foo"),
      "Property 'foo' does not exist on object 'PersonObject'",
    );
    TestCase.assertThrowsContaining(
      () => object.list.max("foo"),
      "Property 'foo' does not exist on object 'PersonObject'",
    );
    TestCase.assertThrowsContaining(
      () => object.list.sum("foo"),
      "Property 'foo' does not exist on object 'PersonObject'",
    );
    TestCase.assertThrowsContaining(
      () => object.list.avg("foo"),
      "Property 'foo' does not exist on object 'PersonObject'",
    );
    TestCase.assertThrowsContaining(() => object.list.min(), "JS value must be of type 'string', got (undefined)");
    TestCase.assertThrowsContaining(() => object.list.max(), "JS value must be of type 'string', got (undefined)");
    TestCase.assertThrowsContaining(() => object.list.sum(), "JS value must be of type 'string', got (undefined)");
    TestCase.assertThrowsContaining(() => object.list.avg(), "JS value must be of type 'string', got (undefined)");
  },

  testListNested: function () {
    const realm = new Realm({ schema: [schemas.ParentObject, schemas.NameObject] });
    realm.write(() => {
      realm.create("ParentObject", {
        id: 1,
        _id: new ObjectId(),
        name: [
          { _id: new ObjectId(), family: "Larsen", given: ["Hans", "Jørgen"], prefix: [] },
          { _id: new ObjectId(), family: "Hansen", given: ["Ib"], prefix: [] },
        ],
      });
      realm.create("ParentObject", {
        id: 2,
        _id: new ObjectId(),
        name: [{ _id: new ObjectId(), family: "Petersen", given: ["Gurli", "Margrete"], prefix: [] }],
      });
    });

    let objects = realm.objects("ParentObject").sorted([["id", false]]);
    TestCase.assertEqual(objects.length, 2);
    TestCase.assertEqual(objects[0].name.length, 2);
    TestCase.assertEqual(objects[0].name[0].given.length, 2);
    TestCase.assertEqual(objects[0].name[0].prefix.length, 0);
    TestCase.assertEqual(objects[0].name[0].given[0], "Hans");
    TestCase.assertEqual(objects[0].name[0].given[1], "Jørgen");
    TestCase.assertEqual(objects[0].name[1].given.length, 1);
    TestCase.assertEqual(objects[0].name[1].given[0], "Ib");
    TestCase.assertEqual(objects[0].name[1].prefix.length, 0);

    TestCase.assertEqual(objects[1].name.length, 1);
    TestCase.assertEqual(objects[1].name[0].given.length, 2);
    TestCase.assertEqual(objects[1].name[0].prefix.length, 0);
    TestCase.assertEqual(objects[1].name[0].given[0], "Gurli");
    TestCase.assertEqual(objects[1].name[0].given[1], "Margrete");
  },

  testListNestedFromJSON: function () {
    let json =
      '{"id":1, "name": [{ "family": "Larsen", "given": ["Hans", "Jørgen"], "prefix": [] }, { "family": "Hansen", "given": ["Ib"], "prefix": [] }] }';
    let parent = JSON.parse(json);
    const realm = new Realm({ schema: [schemas.ParentObjectLocal, schemas.NameObjectLocal] });
    realm.write(() => {
      realm.create("ParentObject", parent);
    });

    let objects = realm.objects("ParentObject");
    TestCase.assertEqual(objects.length, 1);
    TestCase.assertEqual(objects[0].name.length, 2);
    TestCase.assertEqual(objects[0].name[0].given.length, 2);
    TestCase.assertEqual(objects[0].name[0].prefix.length, 0);
    TestCase.assertEqual(objects[0].name[0].given[0], "Hans");
    TestCase.assertEqual(objects[0].name[0].given[1], "Jørgen");

    TestCase.assertEqual(objects[0].name[1].given.length, 1);
    TestCase.assertEqual(objects[0].name[1].prefix.length, 0);
    TestCase.assertEqual(objects[0].name[1].given[0], "Ib");
  },

  testMultipleLists: function () {
    const realm = new Realm({ schema: [schemas.MultiListObject] });
    realm.write(() => {
      realm.create("MultiListObject", { id: 0, list1: ["Hello"], list2: ["World"] });
      realm.create("MultiListObject", { id: 1, list1: ["Foo"], list2: ["Bar"] });
    });

    let objects = realm.objects("MultiListObject");
    TestCase.assertEqual(objects.length, 2);
    TestCase.assertEqual(objects[0].id, 0);
    TestCase.assertEqual(objects[0].list1.length, 1);
    TestCase.assertEqual(objects[0].list1[0], "Hello");
    TestCase.assertEqual(objects[0].list2.length, 1);
    TestCase.assertEqual(objects[0].list2[0], "World");

    TestCase.assertEqual(objects[1].id, 1);
    TestCase.assertEqual(objects[1].list1.length, 1);
    TestCase.assertEqual(objects[1].list1[0], "Foo");
    TestCase.assertEqual(objects[1].list2.length, 1);
    TestCase.assertEqual(objects[1].list2[0], "Bar");
  },

  testGetAndApplySchema: function () {
    const realm1 = new Realm({
      schema: [schemas.NameObjectLocal],
      _cache: false,
    });
    realm1.write(() => {
      realm1.create(schemas.NameObjectLocal.name, { family: "Smith", given: ["Bob", "Ted"] });
    });
    const schema = realm1.schema;
    realm1.close();

    const realm2 = new Realm({
      schema: schema,
      _cache: false,
    });
    let names = realm2.objects(schemas.NameObjectLocal.name);
    TestCase.assertEqual(names.length, 1);
    TestCase.assertEqual(names[0]["family"], "Smith");
    TestCase.assertEqual(names[0]["given"].length, 2);
    realm2.close();
  },

  testCreateEmbeddedObjects: function () {
    const realm = new Realm({ schema: [schemas.ContactSchema, schemas.AddressSchema] });

    realm.write(() => {
      realm.create(schemas.ContactSchema.name, {
        name: "Freddy Krueger",
        address: { street: "Elm Street", city: "Springwood" },
      });
    });

    TestCase.assertEqual(realm.objects(schemas.ContactSchema.name).length, 1);
    TestCase.assertEqual(realm.objects(schemas.ContactSchema.name)[0]["address"]["street"], "Elm Street");

    realm.write(() => {
      realm.create(schemas.ContactSchema.name, { name: "John Doe" });
    });

    let contacts = realm.objects(schemas.ContactSchema.name);
    TestCase.assertEqual(contacts.length, 2);
    TestCase.assertEqual(contacts[0]["address"]["street"], "Elm Street");
    TestCase.assertNull(contacts[1]["address"]);

    realm.close();
  },

  testCreateMultipleEmbeddedObjects: function () {
    const realm = new Realm({ schema: [schemas.HouseOwnerSchema, schemas.AddressSchema] });

    realm.write(() => {
      realm.create(schemas.HouseOwnerSchema.name, {
        name: "Ib",
        addresses: [
          { street: "Algade", city: "Nordby" },
          { street: "Skolevej", city: "Sydpynten" },
        ],
      });
      realm.create(schemas.HouseOwnerSchema.name, { name: "Petra", addresses: [{ street: "Algade", city: "Nordby" }] });
      realm.create(schemas.HouseOwnerSchema.name, { name: "Hans" });
    });

    let owners = realm.objects(schemas.HouseOwnerSchema.name).sorted("name");
    TestCase.assertEqual(owners.length, 3);
    let expectedLength = [0, 2, 1]; // sorted: "Hans", "Ib", "Petra"
    for (let i = 0; i < expectedLength.length; i++) {
      TestCase.assertEqual(owners[i]["addresses"].length, expectedLength[i]);
    }

    const names = ["Hans", "Ib", "Petra"];
    for (let i = 0; i < names.length; i++) {
      TestCase.assertEqual(owners[i]["name"], names[i]);
    }

    // insert an extra address into Hans's list (add embedded object)
    let hans_addrs = owners[0].addresses;
    realm.write(() => {
      hans_addrs.push({ street: "Njalsgade", city: "Islands Brygge" });
    });

    expectedLength = [1, 2, 1];
    for (let i = 0; i < expectedLength.length; i++) {
      TestCase.assertEqual(owners[i]["addresses"].length, expectedLength[i]);
    }

    // remove the last of Hans' addresses
    realm.write(() => {
      hans_addrs.pop();
    });

    expectedLength = [0, 2, 1];
    for (let i = 0; i < expectedLength.length; i++) {
      TestCase.assertEqual(owners[i]["addresses"].length, expectedLength[i]);
    }

    realm.close();
  },

  testCreateNestedEmbeddedObjects: function () {
    const realm = new Realm({
      schema: [schemas.ScoutDivisionSchema, schemas.ScoutGroupSchema, schemas.ScoutBranchSchema],
    });

    realm.write(() => {
      realm.create(schemas.ScoutDivisionSchema.name, {
        name: "Oeresund Division",
        groups: [
          {
            name: "RungstedSpejderne",
            branches: [{ name: "Micro" }, { name: "Mini" }, { name: "Junior" }, { name: "Trop" }],
          },
          {
            name: "Bent Byg",
            branches: [{ name: "Mini" }, { name: "Junior" }, { name: "Trop" }, { name: "Klan" }],
          },
        ],
      });
      realm.create(schemas.ScoutDivisionSchema.name, {
        name: "Bernstorff Division",
        groups: [
          {
            name: "HellerupSpejderne",
            branches: [{ name: "Mini" }, { name: "Flok" }, { name: "Klan" }],
          },
        ],
      });
    });

    let divisions = realm.objects(schemas.ScoutDivisionSchema.name).sorted("name");
    TestCase.assertEqual(divisions.length, 2);

    let bernstorff_groups = divisions[0].groups;
    TestCase.assertEqual(bernstorff_groups.length, 1);

    // add a Group to Bernstorff Division
    realm.write(() => {
      bernstorff_groups.push({
        name: "1. Ordrup",
        branches: [
          { name: "FamilieSpejd" },
          { name: "Mikro" },
          { name: "Ulve" },
          { name: "Hvalpe" },
          { name: "Trop" },
          { name: "Klan" },
        ],
      });
    });

    // check that we have successfully added a Group
    TestCase.assertEqual(divisions[0]["groups"].length, 2);

    realm.close();
  },

  testCreateFreeFloatingEmbeddedObject: function () {
    const realm = new Realm({ schema: [schemas.HouseOwnerSchema, schemas.AddressSchema] });

    // creating standalone embedded object is not allowed
    realm.write(() => {
      TestCase.assertThrows(() => {
        realm.create(schemas.AddressSchema.name, { street: "Njalsgade", city: "Islands Brygge" });
      });
    });

    realm.close();
  },

  testAddEmbeddedObject: function () {
    const realm = new Realm({ schema: [schemas.HouseOwnerSchema, schemas.AddressSchema] });

    realm.write(() => {
      realm.create(schemas.HouseOwnerSchema.name, {
        name: "Ib",
        addresses: [
          { street: "Algade", city: "Nordby" },
          { street: "Skolevej", city: "Sydpynten" },
        ],
      });
    });

    let ib = realm.objectForPrimaryKey(schemas.HouseOwnerSchema.name, "Ib");
    TestCase.assertEqual(ib.addresses.length, 2);

    realm.write(() => {
      TestCase.assertThrows(() => {
        realm.create(schemas.AddressSchema.name, { street: "Njalsgade", city: "Islands Brygge" });
      });

      ib.addresses.push({ street: "Njalsgade", city: "Islands Brygge" });
      TestCase.assertEqual(3, ib.addresses.length);
    });

    realm.close();
  },

  testQueryEmbeddedObject: function () {
    const realm = new Realm({ schema: [schemas.HouseOwnerSchema, schemas.AddressSchema] });
    TestCase.assertThrows(() => {
      realm.objects(schemas.AddressSchema.name);
    });
    realm.close();
  },

  testClassObjectCreation: function () {
    class TodoItem extends Realm.Object {
      constructor(realm, description) {
        super(realm, { done: false, description });
      }
    }

    TodoItem.schema = {
      name: "TodoItem",
      properties: {
        description: "string",
        done: { type: "bool", default: false },
        deadline: "date?",
      },
    };

    class TodoList extends Realm.Object {
      constructor(realm, name) {
        super(realm, { name });
      }
    }

    TodoList.schema = {
      name: "TodoList",
      properties: {
        name: "string",
        items: "TodoItem[]",
      },
    };

    const realm = new Realm({ schema: [TodoList, TodoItem] });
    realm.write(() => {
      const list = realm.create(TodoList, {
        name: "MyTodoList",
      });

      list.items.push(new TodoItem(realm, "Fix that bug"));
      realm.create(TodoItem, new TodoItem(realm, "Fix that bug"));
    });
  },
};
