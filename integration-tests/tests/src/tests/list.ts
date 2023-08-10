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

import Realm, { BSON } from "realm";
import { expectArraysEqual, expectSimilar } from "../utils/comparisons";
import { expect } from "chai";
import { CanonicalObjectSchema } from "realm";
import { openRealmBeforeEach, openRealmBefore } from "../hooks";

const DATA1 = new Uint8Array([0x01]);
const DATA2 = new Uint8Array([0x02]);
const DATA3 = new Uint8Array([0x03]);
const DATE1 = new Date(1);
const DATE2 = new Date(2);
const DATE3 = new Date(3);

const PersonSchema: Realm.ObjectSchema = {
  name: "PersonObject",
  properties: {
    name: "string",
    age: "double",
    married: { type: "bool", default: false },
    children: { type: "list", objectType: "PersonObject" },
    parents: { type: "linkingObjects", objectType: "PersonObject", property: "children" },
  },
};

const LinkTypeSchema: Realm.ObjectSchema = {
  name: "LinkTypesObject",
  properties: {
    objectCol: "TestObject",
    objectCol1: { type: "object", objectType: "TestObject" },
    arrayCol: "TestObject[]",
    arrayCol1: { type: "list", objectType: "TestObject" },
  },
};

const TestObjectSchema: Realm.ObjectSchema = {
  name: "TestObject",
  properties: {
    doubleCol: "double",
  },
};

const PrimitiveArraysSchema: Realm.ObjectSchema = {
  name: "PrimitiveArrays",
  properties: {
    bool: "bool[]",
    int: "int[]",
    float: "float[]",
    double: "double[]",
    string: "string[]",
    date: "date[]",
    data: "data[]",
    decimal128: "decimal128[]",
    objectId: "objectId[]",
    uuid: "uuid[]",

    optBool: "bool?[]",
    optInt: "int?[]",
    optFloat: "float?[]",
    optDouble: "double?[]",
    optString: "string?[]",
    optDate: "date?[]",
    optData: "data?[]",
    optDecimal128: "decimal128?[]",
    optObjectId: "objectId?[]",
    optUuid: "uuid?[]",
  },
};

const PersonListSchema: Realm.ObjectSchema = {
  name: "PersonList",
  properties: {
    list: "PersonObject[]",
  },
};
const UuidListSchema: Realm.ObjectSchema = {
  name: "PrimUuidListsObject",
  primaryKey: "_id",
  properties: {
    _id: "uuid",
    list: "uuid[]",
  },
};

const TargetSchema: Realm.ObjectSchema = {
  name: "Target",
  properties: { value: "int" },
};
const MidSchema: Realm.ObjectSchema = {
  name: "Mid",
  properties: { value: "int", link: "Target" },
};
const ListSchema: Realm.ObjectSchema = {
  name: "List",
  properties: { list: { type: "list", objectType: "Mid" } },
};

const NullableBasicTypesSchema: Realm.ObjectSchema = {
  name: "NullableBasicTypesObject",
  properties: {
    boolCol: "bool?",
    intCol: "int?",
    floatCol: "float?",
    doubleCol: "double?",
    stringCol: "string?",
    dateCol: "date?",
    dataCol: "data?",
  },
};

const NullableBasicTypesListSchema: Realm.ObjectSchema = {
  name: "NullableBasicTypesList",
  properties: {
    list: "NullableBasicTypesObject[]",
  },
};

const NameObjectSchema: Realm.ObjectSchema = {
  name: "NameObject",
  primaryKey: "_id",
  properties: {
    _id: "objectId",
    family: "string",
    given: "string[]",
    prefix: "string[]",
  },
};

const ParentObjectSchema: Realm.ObjectSchema = {
  name: "ParentObject",
  primaryKey: "_id",
  properties: {
    _id: "objectId",
    id: "int",
    name: "NameObject[]",
  },
};

const NameObjectLocalSchema: Realm.ObjectSchema = {
  name: "NameObjectLocal",
  properties: {
    family: "string",
    given: "string[]",
    prefix: "string[]",
  },
};

const ParentObjectLocalSchema: Realm.ObjectSchema = {
  name: "ParentObjectLocal",
  properties: {
    id: "int",
    name: "NameObjectLocal[]",
  },
};

const MultiListObjectSchema: Realm.ObjectSchema = {
  name: "MultiListObject",
  properties: {
    id: "int",
    list1: "string[]",
    list2: "string[]",
  },
};

const AddressSchema: Realm.ObjectSchema = {
  name: "Address",
  embedded: true,
  properties: {
    street: "string",
    city: "string",
  },
};

const ContactSchema: Realm.ObjectSchema = {
  name: "Contact",
  properties: {
    name: "string",
    address: "Address",
  },
};

const HouseOwnerSchema: Realm.ObjectSchema = {
  name: "HouseOwner",
  primaryKey: "name",
  properties: {
    name: "string",
    addresses: { type: "list", objectType: "Address" },
  },
};

const ScoutDivisionSchema: Realm.ObjectSchema = {
  name: "ScoutDivision",
  primaryKey: "name",
  properties: {
    name: "string",
    groups: { type: "list", objectType: "ScoutGroup" },
  },
};

const ScoutGroupSchema: Realm.ObjectSchema = {
  name: "ScoutGroup",
  embedded: true,
  properties: {
    name: "string",
    branches: { type: "list", objectType: "ScoutBranch" },
  },
};

const ScoutBranchSchema: Realm.ObjectSchema = {
  name: "ScoutBranch",
  embedded: true,
  properties: {
    name: "string",
  },
};

interface IPersonSchema {
  name: string;
  age: number;
  married: boolean;
  children: Realm.List<IPersonSchema>;
  parents: Realm.Collection<IPersonSchema>;
}

interface ILinkTypeSchema {
  objectCol: ITestObjectSchema;
  objectCol1: ITestObjectSchema;
  arrayCol: Realm.List<ITestObjectSchema>;
  arrayCol1: Realm.List<ITestObjectSchema>;
}

interface ITestObjectSchema {
  doubleCol: number;
}

interface IPrimitiveArraysSchema {
  bool: Realm.List<boolean>;
  int: Realm.List<number>;
  float: Realm.List<number>;
  double: Realm.List<number>;
  string: Realm.List<string>;
  date: Realm.List<Date>;
  data: Realm.List<ArrayBuffer>;
  decimal128: Realm.List<BSON.Decimal128>;
  objectId: Realm.List<BSON.ObjectId>;
  uuid: Realm.List<BSON.UUID>;

  optBool: Realm.List<boolean | null>;
  optInt: Realm.List<number | null>;
  optFloat: Realm.List<number | null>;
  optDouble: Realm.List<number | null>;
  optString: Realm.List<string | null>;
  optDate: Realm.List<Date | null>;
  optData: Realm.List<ArrayBuffer | null>;
  optDecimal128: Realm.List<BSON.Decimal128 | null>;
  optObjectId: Realm.List<BSON.ObjectId | null>;
  optUuid: Realm.List<BSON.UUID | null>;
}

interface IPersonListSchema {
  list: Realm.List<IPersonSchema>;
}

interface IUuidListSchema {
  _id: BSON.UUID;
  list: BSON.UUID[];
}

interface ITargetSchema {
  value: number;
}

interface IMidSchema {
  value: number;
  link: ITargetSchema;
}

interface IListSchema {
  list: Realm.List<IMidSchema>;
}

interface INullableBasicTypesSchema {
  boolCol: boolean | undefined;
  intCol: number | undefined;
  floatCol: number | undefined;
  doubleCol: number | undefined;
  stringCol: string | undefined;
  dateCol: Date | undefined;
  dataCol: ArrayBuffer | undefined;
}

interface INullableBasicTypesListSchema {
  list: Realm.List<INullableBasicTypesSchema>;
}

interface INameObjectSchema {
  _id: BSON.ObjectId;
  family: string;
  given: string[];
  prefix: string[];
}

interface IParentObjectSchema {
  _id: BSON.ObjectId;
  id: number;
  name: INameObjectSchema[];
}

interface IParentObjectLocalSchema {
  id: number;
  name: INameObjectSchema[];
}

interface IMultiListObjectSchema {
  id: number;
  list1: string[];
  list2: string[];
}

class PrimitiveArrays extends Realm.Object<PrimitiveArrays> {
  bool!: Realm.List<boolean>;
  int!: Realm.List<number>;
  float!: Realm.List<number>;
  double!: Realm.List<number>;
  string!: Realm.List<string>;
  date!: Realm.List<Date>;
  data!: Realm.List<ArrayBuffer>;
  decimal128!: Realm.List<BSON.Decimal128>;
  objectId!: Realm.List<BSON.ObjectId>;
  uuid!: Realm.List<BSON.UUID>;

  optBool!: Realm.List<boolean | null>;
  optInt!: Realm.List<number | null>;
  optFloat!: Realm.List<number | null>;
  optDouble!: Realm.List<number | null>;
  optString!: Realm.List<string | null>;
  optDate!: Realm.List<Date | null>;
  optData!: Realm.List<ArrayBuffer | null>;
  optDecimal128!: Realm.List<BSON.Decimal128 | null>;
  optObjectId!: Realm.List<BSON.ObjectId | null>;
  optUuid!: Realm.List<BSON.UUID | null>;

  static schema: Realm.ObjectSchema = PrimitiveArraysSchema;
}

class TodoItem extends Realm.Object {
  constructor(realm: Realm, description: string) {
    super(realm, { done: false, description });
  }
}

//@ts-expect-error TYPEBUG: should add schema field to Realm.object
TodoItem.schema = {
  name: "TodoItem",
  properties: {
    description: "string",
    done: { type: "bool", default: false },
    deadline: "date?",
  },
};

class TodoList extends Realm.Object {
  constructor(realm: Realm, name: string) {
    super(realm, { name });
  }
}

//@ts-expect-error TYPEBUG: should add schema field to Realm.object
TodoList.schema = {
  name: "TodoList",
  properties: {
    name: "string",
    items: "TodoItem[]",
  },
};

describe("Lists", () => {
  describe("constructor", () => {
    openRealmBeforeEach({ schema: [PersonSchema, PersonListSchema] });
    it("matches expected instanceof", function (this: RealmContext) {
      this.realm.write(() => {
        const obj = this.realm.create<IPersonListSchema>("PersonList", { list: [] });
        expect(obj.list).instanceOf(Realm.List);
        expect(obj.list).instanceOf(Realm.Collection);
      });
      expect(() => new Realm.List()).throws(Error, "constructor");
      expect(Realm.List).instanceOf(Function);
    });
  });
  describe("types", () => {
    openRealmBeforeEach({ schema: [LinkTypeSchema, TestObjectSchema, PrimitiveArrays] });

    it("instancetypes are correct", function (this: RealmContext) {
      let obj!: ILinkTypeSchema;
      let prim!: PrimitiveArrays;
      this.realm.write(() => {
        obj = this.realm.create<ILinkTypeSchema>(LinkTypeSchema.name, {});
        prim = this.realm.create(PrimitiveArrays, {});
      });

      // Check instance type
      expect(obj.arrayCol.type).equals("object");
      expect(obj.arrayCol1.type).equals("object");

      expect(prim.bool.type).equals("bool");
      expect(prim.int.type).equals("int");
      expect(prim.float.type).equals("float");
      expect(prim.double.type).equals("double");
      expect(prim.string.type).equals("string");
      expect(prim.date.type).equals("date");
      expect(prim.decimal128.type).equals("decimal128");
      expect(prim.objectId.type).equals("objectId");
      expect(prim.uuid.type).equals("uuid");

      expect(prim.optBool?.type).equals("bool");
      expect(prim.optInt?.type).equals("int");
      expect(prim.optFloat?.type).equals("float");
      expect(prim.optDouble?.type).equals("double");
      expect(prim.optString?.type).equals("string");
      expect(prim.optDate?.type).equals("date");
      expect(prim.optDecimal128?.type).equals("decimal128");
      expect(prim.optObjectId?.type).equals("objectId");
      expect(prim.optUuid?.type).equals("uuid");

      // Check schema objectType
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const pa: CanonicalObjectSchema = this.realm.schema.find((s) => s.name === PrimitiveArraysSchema.name)!;

      expect(pa.properties.bool.objectType).equals("bool");
      expect(pa.properties.int.objectType).equals("int");
      expect(pa.properties.float.objectType).equals("float");
      expect(pa.properties.double.objectType).equals("double");
      expect(pa.properties.string.objectType).equals("string");
      expect(pa.properties.date.objectType).equals("date");
      expect(pa.properties.decimal128.objectType).equals("decimal128");
      expect(pa.properties.objectId.objectType).equals("objectId");
      expect(pa.properties.uuid.objectType).equals("uuid");

      expect(pa.properties.optBool.objectType).equals("bool");
      expect(pa.properties.optInt.objectType).equals("int");
      expect(pa.properties.optFloat.objectType).equals("float");
      expect(pa.properties.optDouble.objectType).equals("double");
      expect(pa.properties.optString.objectType).equals("string");
      expect(pa.properties.optDate.objectType).equals("date");
      expect(pa.properties.optDecimal128.objectType).equals("decimal128");
      expect(pa.properties.optObjectId.objectType).equals("objectId");
      expect(pa.properties.optUuid.objectType).equals("uuid");

      // Check optional
      expect(prim.bool.optional).to.be.false;
      expect(prim.int.optional).to.be.false;
      expect(prim.float.optional).to.be.false;
      expect(prim.double.optional).to.be.false;
      expect(prim.string.optional).to.be.false;
      expect(prim.date.optional).to.be.false;
      expect(prim.decimal128.optional).to.be.false;
      expect(prim.objectId.optional).to.be.false;
      expect(prim.uuid.optional).to.be.false;

      expect(prim.optBool?.optional).to.be.true;
      expect(prim.optInt?.optional).to.be.true;
      expect(prim.optFloat?.optional).to.be.true;
      expect(prim.optDouble?.optional).to.be.true;
      expect(prim.optString?.optional).to.be.true;
      expect(prim.optDate?.optional).to.be.true;
      expect(prim.optDecimal128?.optional).to.be.true;
      expect(prim.optObjectId?.optional).to.be.true;
      expect(prim.optUuid?.optional).to.be.true;
    });
  });
  describe("length", () => {
    openRealmBeforeEach({ schema: [LinkTypeSchema, TestObjectSchema] });
    it("returns exptected length", function (this: RealmContext) {
      let array!: Realm.List<ITestObjectSchema>;

      this.realm.write(() => {
        const obj = this.realm.create<ILinkTypeSchema>("LinkTypesObject", {
          objectCol: { doubleCol: 1 },
          objectCol1: { doubleCol: 2 },
          arrayCol: [{ doubleCol: 3 }],
        });

        array = obj.arrayCol;
        expect(array.length).equals(1);

        //@ts-expect-error TYPEBUG: type missmatch, forcecasting shouldn't be done
        obj.arrayCol = [];
        expect(array.length).equals(0);

        //@ts-expect-error TYPEBUG: type missmatch, forcecasting shouldn't be done
        obj.arrayCol = [{ doubleCol: 1 }, { doubleCol: 2 }];
        expect(array.length).equals(2);
        expect(() => (array.length = 0)).throws(Error, "Cannot assign to read only property 'length'");

        expect(array.length).equals(2);
      });
    });
  });
  describe("subscripts", () => {
    openRealmBeforeEach({ schema: [LinkTypeSchema, TestObjectSchema, PrimitiveArrays] });
    //TODO figure out why undefined is not returned in react-native https://github.com/realm/realm-js/issues/5463.
    it.skipIf(environment.reactNative, "invalid object access returns undefined", function (this: RealmContext) {
      this.realm.write(() => {
        const obj = this.realm.create<ILinkTypeSchema>("LinkTypesObject", {
          objectCol: { doubleCol: 1 },
          objectCol1: { doubleCol: 2 },
          arrayCol: [{ doubleCol: 3 }],
        });
        //@ts-expect-error TYPEBUG: indexing by string on results is not allowed typewise
        expect(obj?.arrayCol[""]).to.be.undefined;
      });
    });
    it("support getters", function (this: RealmContext) {
      let obj!: ILinkTypeSchema;
      let prim!: PrimitiveArrays;

      this.realm.write(() => {
        obj = this.realm.create<ILinkTypeSchema>(LinkTypeSchema.name, {
          objectCol: { doubleCol: 1 },
          objectCol1: { doubleCol: 2 },
          arrayCol: [{ doubleCol: 3 }, { doubleCol: 4 }],
          arrayCol1: [{ doubleCol: 5 }, { doubleCol: 6 }],
        });
        prim = this.realm.create(PrimitiveArrays, {
          bool: [true, false],
          int: [1, 2],
          float: [1.1, 2.2],
          double: [1.11, 2.22],
          string: ["a", "b"],
          date: [new Date(1), new Date(2)],
          data: [DATA1, DATA2],
          decimal128: [BSON.Decimal128.fromString("1"), BSON.Decimal128.fromString("2")],
          objectId: [new BSON.ObjectId("0000002a9a7969d24bea4cf2"), new BSON.ObjectId("0000002a9a7969d24bea4cf3")],
          uuid: [
            new BSON.UUID("a4078b20-7b0c-4de4-929c-4cc1c7d8345f"),
            new BSON.UUID("b7821fd0-38cf-4f94-8650-d0f5b6295ef4"),
          ],

          optBool: [true, null],
          optInt: [1, null],
          optFloat: [1.1, null],
          optDouble: [1.11, null],
          optString: ["a", null],
          optDate: [new Date(1), null],
          optData: [DATA1, null],
          optDecimal128: [BSON.Decimal128.fromString("1"), null],
          optObjectId: [new BSON.ObjectId("0000002a9a7969d24bea4cf2"), null],
          optUuid: [new BSON.UUID("a4078b20-7b0c-4de4-929c-4cc1c7d8345f"), null],
        });
      });
      expect(obj?.arrayCol[0].doubleCol).equals(3);
      expect(obj?.arrayCol[1].doubleCol).equals(4);
      expect(obj?.arrayCol[2]).equals(undefined);
      expect(obj?.arrayCol[-1]).equals(undefined);

      expect(obj.arrayCol1[0].doubleCol).equals(5);
      expect(obj.arrayCol1[1].doubleCol).equals(6);
      expect(obj.arrayCol1[2]).equals(undefined);
      expect(obj.arrayCol1[-1]).equals(undefined);
      for (const field of prim.keys()) {
        //@ts-expect-error TYPEBUG: our List type-definition expects index accesses to be done with a number , should probably be extended.
        expect(prim[field][2]).equals(undefined);
        //@ts-expect-error TYPEBUG: our List type-definition expects index accesses to be done with a number , should probably be extended.
        expect(prim[field][-1]).equals(undefined);
        //@ts-expect-error TYPEBUG: our List type-definition expects index accesses to be done with a number , should probably be extended.
        expect(prim[field]["foo"]).equals(undefined);
        if (field.includes("opt")) {
          //@ts-expect-error TYPEBUG: our List type-definition expects index accesses to be done with a number , should probably be extended.
          expect(prim[field][1]).equals(null, `FIELD: ${field}`);
        }
      }
      expect(prim.bool[0]).equals(true);
      expect(prim.bool[1]).equals(false);
      expect(prim.int[0]).equals(1);
      expect(prim.int[1]).equals(2);
      expectSimilar("float", prim.float[0], 1.1);
      expectSimilar("float", prim.float[1], 2.2);
      expect(prim.double[0]).equals(1.11);
      expect(prim.double[1]).equals(2.22);
      expect(prim.string[0]).equals("a");
      expect(prim.string[1]).equals("b");
      expectSimilar("data", new Uint8Array(prim.data[0]), DATA1);
      expectSimilar("data", new Uint8Array(prim.data[1]), DATA2);
      expectSimilar("date", prim.date[0], new Date(1));
      expectSimilar("date", prim.date[1], new Date(2));
      expectSimilar("decimal128", prim.decimal128[0], BSON.Decimal128.fromString("1"));
      expectSimilar("decimal128", prim.decimal128[1], BSON.Decimal128.fromString("2"));
      expectSimilar("objectId", prim.objectId[0], new BSON.ObjectId("0000002a9a7969d24bea4cf2"));
      expectSimilar("objectId", prim.objectId[1], new BSON.ObjectId("0000002a9a7969d24bea4cf3"));
      expectSimilar("uuid", prim.uuid[0], new BSON.UUID("a4078b20-7b0c-4de4-929c-4cc1c7d8345f"));
      expectSimilar("uuid", prim.uuid[1], new BSON.UUID("b7821fd0-38cf-4f94-8650-d0f5b6295ef4"));

      expect(prim.optBool[0]).equals(true);
      expect(prim.optInt[0]).equals(1);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      expectSimilar("float", prim.optFloat[0]!, 1.1);
      expect(prim.optDouble[0]).equals(1.11);
      expect(prim.optString[0]).equals("a");
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      expectSimilar("data", new Uint8Array(prim.optData[0]!), DATA1);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      expectSimilar("date", prim.optDate[0]!, new Date(1));
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      expectSimilar("decimal128", prim.optDecimal128[0]!, BSON.Decimal128.fromString("1"));
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      expectSimilar("decimal128", prim.optDecimal128[1]!, null);
      expectSimilar("objectId", prim.optObjectId[0], new BSON.ObjectId("0000002a9a7969d24bea4cf2"));
      expectSimilar("uuid", prim.optUuid[0], new BSON.UUID("a4078b20-7b0c-4de4-929c-4cc1c7d8345f"));
      expectSimilar("uuid", prim.optUuid[1], null);
    });
    it("support setters", function (this: RealmContext) {
      let array: Realm.List<ITestObjectSchema>;

      this.realm.write(() => {
        const obj = this.realm.create<ILinkTypeSchema>(LinkTypeSchema.name, {
          objectCol: { doubleCol: 1 },
          objectCol1: { doubleCol: 2 },
          arrayCol: [{ doubleCol: 3 }, { doubleCol: 4 }],
        });
        const prim = this.realm.create<IPrimitiveArraysSchema>(PrimitiveArraysSchema.name, {});
        array = obj.arrayCol;

        array[0] = { doubleCol: 5 };
        array[1] = { doubleCol: 6 };
        expect(array[0].doubleCol).equals(5);
        expect(array[1].doubleCol).equals(6);

        array[0] = obj.objectCol;
        array[1] = obj.objectCol1;
        expect(array[0].doubleCol).equals(1);
        expect(array[1].doubleCol).equals(2);
        //@ts-expect-error can not assign null to list of objects.
        expect(() => (array[0] = null)).throws(Error, "null");
        //@ts-expect-error can not pass incomplete object to list.
        expect(() => (array[0] = {})).throws(Error, "Missing value for property 'doubleCol'");
        //@ts-expect-error can not pass object with invalid properties to list.
        expect(() => (array[0] = { foo: "bar" })).throws(Error, "Missing value for property 'doubleCol'");
        //@ts-expect-error can not assign an invalid object type to list.
        expect(() => (array[0] = prim)).throws(Error, "Missing value for property 'doubleCol'");
        //@ts-expect-error can not assign an array to a list of objects.
        expect(() => (array[0] = array)).throws(Error, "Missing value for property 'doubleCol'");
        expect(() => (array[2] = { doubleCol: 1 })).throws(
          Error,
          "Requested index 2 calling set() on list 'LinkTypesObject.arrayCol' when max is 1",
        );
        expect(() => (array[-1] = { doubleCol: 1 })).throws(Error, "Index -1 cannot be less than zero.");

        //@ts-expect-error TYPEBUG: our List type-definition expects index accesses to be done with a number , should probably be extended.
        array["foo"] = "bar";
        //@ts-expect-error TYPEBUG: foo does not exist in the schema since the schema has been dynamically updated.
        expect(array.foo).equals("bar");

        function testAssign(name: string, v1: any, v2: any) {
          //@ts-expect-error TYPEBUG: our List type-definition expects index accesses to be done with a number , should probably be extended.
          prim[name].push(v1);
          //@ts-expect-error TYPEBUG: our List type-definition expects index accesses to be done with a number , should probably be extended.
          expectSimilar(prim[name].type, prim[name][0], v1);
          //@ts-expect-error TYPEBUG: our List type-definition expects index accesses to be done with a number , should probably be extended.
          prim[name][0] = v2;
          //@ts-expect-error TYPEBUG: our List type-definition expects index accesses to be done with a number , should probably be extended.
          expectSimilar(prim[name].type, prim[name][0], v2);
        }

        testAssign("bool", true, false);
        testAssign("int", 1, 2);
        testAssign("float", 1.1, 2.2);
        testAssign("double", 1.1, 2.2);
        testAssign("string", "a", "b");
        testAssign("data", DATA1, DATA2);
        testAssign("date", DATE1, DATE2);

        function testAssignNull(name: string, expected: string) {
          //@ts-expect-error TYPEBUG: our List type-definition expects index accesses to be done with a number , should probably be extended.
          expect(() => (prim[name][0] = null)).throws(`Expected value to be ${expected}, got null`);
        }

        testAssignNull("bool", "a boolean");
        testAssignNull("int", "a number or bigint");
        testAssignNull("float", "a number");
        testAssignNull("double", "a number");
        testAssignNull("string", "a string");
        testAssignNull("data", "an instance of ArrayBuffer");
        testAssignNull("date", "an instance of Date");

        testAssign("optBool", true, null);
        testAssign("optInt", 1, null);
        testAssign("optFloat", 1.1, null);
        testAssign("optDouble", 1.1, null);
        testAssign("optString", "a", null);
        testAssign("optData", DATA1, null);
        testAssign("optDate", DATE1, null);
      });
      expect(() => (array[0] = { doubleCol: 1 })).throw(
        Error,
        "Cannot modify managed objects outside of a write transaction.",
      );
      //@ts-expect-error TYPEBUG: our List type-definition expects index accesses to be done with a number , should probably be extended.
      array["foo"] = "baz";
      //@ts-expect-error TYPEBUG: foo does not exist in the schema since the schema has been dynamically updated.
      expect(array.foo).equals("baz");
    });
  });
  describe("assignments", () => {
    openRealmBeforeEach({
      schema: [LinkTypeSchema, TestObjectSchema, PersonListSchema, PersonSchema, PrimitiveArraysSchema],
    });
    it("are typesafe", function (this: RealmContext) {
      let obj: ILinkTypeSchema;
      let prim: IPrimitiveArraysSchema;
      this.realm.write(() => {
        obj = this.realm.create<ILinkTypeSchema>(LinkTypeSchema.name, {});
        prim = this.realm.create<IPrimitiveArraysSchema>(PrimitiveArraysSchema.name, {});
        const person = this.realm.create(PersonSchema.name, { name: "a", age: 2.0 });
        const personList = this.realm.create<IPersonListSchema>(PersonListSchema.name, { list: [person] }).list;

        //@ts-expect-error number is not assignable to TestObject.
        expect(() => (obj.arrayCol = [0])).throws("Expected 'arrayCol[0]' to be an object, got a number");
        //@ts-expect-error null is not assignable to TestObject.
        expect(() => (obj.arrayCol = [null])).throws("Expected 'arrayCol[0]' to be an object, got null");
        //@ts-expect-error Person is not assignable to TestObject.
        expect(() => (obj.arrayCol = [person])).throws("Missing value for property 'doubleCol'");
        //@ts-expect-error PersonList is not assignable to TestObjectList.
        expect(() => (obj.arrayCol = personList)).throws("Missing value for property 'doubleCol'");
        //@ts-expect-error TYPEBUG: type missmatch, forcecasting shouldn't be done
        obj.arrayCol = [this.realm.create<ITestObjectSchema>(TestObjectSchema.name, { doubleCol: 1.0 })];
        expect(obj.arrayCol[0].doubleCol).equals(1.0);
        obj.arrayCol = obj.arrayCol; // eslint-disable-line no-self-assign
        expect(obj.arrayCol[0].doubleCol).equals(1.0);

        //@ts-expect-error Person is not assignable to boolean.
        expect(() => (prim.bool = [person])).throws(
          Error,
          "Expected 'bool[0]' to be a boolean, got an instance of PersonObject",
        );
        //@ts-expect-error Person is not assignable to int.
        expect(() => (prim.int = [person])).throws(
          "Expected 'int[0]' to be a number or bigint, got an instance of PersonObject",
        );
        //@ts-expect-error Person is not assignable to float.
        expect(() => (prim.float = [person])).throws(
          "Expected 'float[0]' to be a number, got an instance of PersonObject",
        );
        //@ts-expect-error Person is not assignable to double.
        expect(() => (prim.double = [person])).throws(
          "Expected 'double[0]' to be a number, got an instance of PersonObject",
        );
        //@ts-expect-error Person is not assignable to string.
        expect(() => (prim.string = [person])).throws(
          "Expected 'string[0]' to be a string, got an instance of PersonObject",
        );
        //@ts-expect-error Person is not assignable to data.
        expect(() => (prim.data = [person])).throws(
          "Expected 'data[0]' to be an instance of ArrayBuffer, got an instance of PersonObject",
        );
        //@ts-expect-error Person is not assignable to date.
        expect(() => (prim.date = [person])).throws(
          "Expected 'date[0]' to be an instance of Date, got an instance of PersonObject",
        );
        //@ts-expect-error Person is not assignable to optional bool.
        expect(() => (prim.optBool = [person])).throws(
          "Expected 'optBool[0]' to be a boolean, got an instance of PersonObject",
        );
        //@ts-expect-error Person is not assignable to optional int.
        expect(() => (prim.optInt = [person])).throws(
          "Expected 'optInt[0]' to be a number or bigint, got an instance of PersonObject",
        );
        //@ts-expect-error Person is not assignable to optional float.
        expect(() => (prim.optFloat = [person])).throws(
          "Expected 'optFloat[0]' to be a number, got an instance of PersonObject",
        );
        //@ts-expect-error Person is not assignable to optional double.
        expect(() => (prim.optDouble = [person])).throws(
          "Expected 'optDouble[0]' to be a number, got an instance of PersonObject",
        );
        //@ts-expect-error Person is not assignable to optional string.
        expect(() => (prim.optString = [person])).throws(
          "Expected 'optString[0]' to be a string, got an instance of PersonObject",
        );
        //@ts-expect-error Person is not assignable to optional data.
        expect(() => (prim.optData = [person])).throws(
          "Expected 'optData[0]' to be an instance of ArrayBuffer, got an instance of PersonObject",
        );
        //@ts-expect-error Person is not assignable to optional date.
        expect(() => (prim.optDate = [person])).throws(
          "Expected 'optDate[0]' to be an instance of Date, got an instance of PersonObject",
        );

        function testAssign(name: string, value: any) {
          //@ts-expect-error TYPEBUG: our List type-definition expects index accesses to be done with a number , should probably be extended.
          prim[name] = [value];
          //@ts-expect-error TYPEBUG: our List type-definition expects index accesses to be done with a number , should probably be extended.
          expectSimilar(prim[name].type, prim[name][0], value);
        }

        testAssign("bool", true);
        testAssign("int", 1);
        testAssign("float", 1.1);
        testAssign("double", 1.1);
        testAssign("string", "a");
        testAssign("data", DATA1);
        testAssign("date", DATE1);

        function testAssignNull(name: string, expected: string) {
          //@ts-expect-error TYPEBUG: our List type-definition expects index accesses to be done with a number , should probably be extended.
          expect(() => (prim[name] = [null])).throws(Error, `Expected '${name}[0]' to be ${expected}, got null`);
          //@ts-expect-error TYPEBUG: our List type-definition expects index accesses to be done with a number , should probably be extended.
          expect(prim[name].length).equals(1);
        }

        testAssignNull("bool", "a boolean");
        testAssignNull("int", "a number or bigint");
        testAssignNull("float", "a number");
        testAssignNull("double", "a number");
        testAssignNull("string", "a string");
        testAssignNull("data", "an instance of ArrayBuffer");
        testAssignNull("date", "an instance of Date");

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

      //@ts-expect-error throws on modification outside of transaction.
      expect(() => (obj.arrayCol = [])).throws("Cannot modify managed objects outside of a write transaction.");
      //@ts-expect-error throws on modification outside of transaction.
      expect(() => (prim.bool = [])).throws("Cannot modify managed objects outside of a write transaction.");
    });
  });
  describe("operations", () => {
    openRealmBeforeEach({ schema: [LinkTypeSchema, TestObjectSchema, PersonSchema, PersonListSchema] });
    it("supports enumeration", function (this: RealmContext) {
      let obj!: ILinkTypeSchema;

      this.realm.write(() => {
        obj = this.realm.create<ILinkTypeSchema>(LinkTypeSchema.name, {
          objectCol: { doubleCol: 1 },
          objectCol1: { doubleCol: 2 },
          arrayCol: [],
        });
      });

      for (const index in obj.arrayCol) {
        expect(true).equals(false, "No objects should have been enumerated: " + index);
      }

      this.realm.write(() => {
        //@ts-expect-error TYPEBUG: type missmatch, forcecasting shouldn't be done
        obj.arrayCol = [{ doubleCol: 0 }, { doubleCol: 1 }];
      });
      expect(obj.arrayCol.length).equals(2);

      let count = 0;
      const keys = Object.keys(obj.arrayCol);
      for (const index in obj.arrayCol) {
        expect(count++).equals(+index);
        expect(keys[index]).equals(index);
      }
      expect(count).equals(2);
      expect(keys.length).equals(2);
    });
    it("supports push", function (this: RealmContext) {
      let array!: Realm.List<ITestObjectSchema>;

      this.realm.write(() => {
        const obj = this.realm.create<ILinkTypeSchema>(LinkTypeSchema.name, {
          objectCol: { doubleCol: 1 },
          objectCol1: { doubleCol: 2 },
          arrayCol: [{ doubleCol: 3 }],
        });

        array = obj.arrayCol;
        expect(array.length).equals(1);

        expect(array.push({ doubleCol: 4 })).equals(2);
        expect(array.length).equals(2);
        expect(array[1].doubleCol).equals(4);
        expect(array.push(obj.objectCol, obj.objectCol1)).equals(4);
        expect(array.length).equals(4);
        expect(array[2].doubleCol).equals(1);
        expect(array[3].doubleCol).equals(2);
        expect(array.push()).equals(4);
        expect(array.length).equals(4);
      });

      expect(array.length).equals(4);
      //@ts-expect-error throws on modification outside of transaction.
      expect(() => array.push([1])).throws("Cannot modify managed objects outside of a write transaction.");
    });
    it("supports pop", function (this: RealmContext) {
      let array!: Realm.List<ITestObjectSchema>;

      this.realm.write(() => {
        const obj = this.realm.create<ILinkTypeSchema>(LinkTypeSchema.name, {
          objectCol: { doubleCol: 1 },
          objectCol1: { doubleCol: 2 },
          arrayCol: [{ doubleCol: 3 }, { doubleCol: 4 }],
        });

        array = obj.arrayCol;
        expect(array.pop()?.doubleCol).equals(4);
        expect(array.pop()?.doubleCol).equals(3);
        expect(array.length).equals(0);
        expect(array.pop()).equals(undefined);
      });

      expect(() => array.pop()).throws("Cannot modify managed objects outside of a write transaction.");
    });
    it("supports unshift", function (this: RealmContext) {
      let array!: Realm.List<ITestObjectSchema>;

      this.realm.write(() => {
        const obj = this.realm.create<ILinkTypeSchema>(LinkTypeSchema.name, {
          objectCol: { doubleCol: 1 },
          objectCol1: { doubleCol: 2 },
          arrayCol: [{ doubleCol: 3 }],
        });

        array = obj.arrayCol;
        expect(array.length).equals(1);

        expect(array.unshift({ doubleCol: 5 })).equals(2);
        expect(array.length).equals(2);
        expect(array[0].doubleCol).equals(5);

        expect(array.unshift(obj.objectCol, obj.objectCol1)).equals(4);
        expect(array.length).equals(4);
        expect(array[0].doubleCol).equals(1);
        expect(array[1].doubleCol).equals(2);

        expect(array.unshift()).equals(4);
        expect(array.length).equals(4);
      });

      expect(array.length).equals(4);
      expect(() => array.unshift({ doubleCol: 1 })).throws(
        "Cannot modify managed objects outside of a write transaction.",
      );
    });
    it("supports shift", function (this: RealmContext) {
      let array!: Realm.List<ITestObjectSchema>;

      this.realm.write(() => {
        const obj = this.realm.create<ILinkTypeSchema>(LinkTypeSchema.name, {
          objectCol: { doubleCol: 1 },
          objectCol1: { doubleCol: 2 },
          arrayCol: [{ doubleCol: 3 }, { doubleCol: 4 }],
        });

        array = obj.arrayCol;
        expect(array.shift()?.doubleCol).equals(3);
        expect(array.shift()?.doubleCol).equals(4);
        expect(array.length).equals(0);
        expect(array.shift()).equals(undefined);
      });

      expect(() => array.shift()).throws("Cannot modify managed objects outside of a write transaction.");
    });
    it("supports splice", function (this: RealmContext) {
      let array!: Realm.List<ITestObjectSchema>;
      this.realm.write(() => {
        const obj = this.realm.create<ILinkTypeSchema>(LinkTypeSchema.name, {
          objectCol: { doubleCol: 1 },
          objectCol1: { doubleCol: 2 },
          arrayCol: [{ doubleCol: 3 }, { doubleCol: 4 }],
        });

        array = obj.arrayCol;
        let removed;

        removed = array.splice(0, 0, obj.objectCol, obj.objectCol1);
        expect(removed.length).equals(0);
        expect(array.length).equals(4);
        expect(array[0].doubleCol).equals(1);
        expect(array[1].doubleCol).equals(2);

        removed = array.splice(2, 2, { doubleCol: 5 }, { doubleCol: 6 });
        expect(removed.length).equals(2);
        expect(removed[0].doubleCol).equals(3);
        expect(removed[1].doubleCol).equals(4);
        expect(array.length).equals(4);
        expect(array[2].doubleCol).equals(5);
        expect(array[3].doubleCol).equals(6);

        removed = array.splice(2, 2);
        expect(removed.length).equals(2);
        expect(removed[0].doubleCol).equals(5);
        expect(removed[1].doubleCol).equals(6);
        expect(array.length).equals(2);
        expect(array[0].doubleCol).equals(1);
        expect(array[1].doubleCol).equals(2);

        removed = array.splice(-1, 1);
        expect(removed.length).equals(1);
        expect(removed[0].doubleCol).equals(2);
        expect(array.length).equals(1);
        expect(array[0].doubleCol).equals(1);

        removed = array.splice(0, 2);
        expect(removed.length).equals(1);
        expect(removed[0].doubleCol).equals(1);
        expect(array.length).equals(0);

        // While supported on arrays by some engines, we don't coerce strings to numbers here
        // removed = array.splice("0", "0", obj.objectCol);
        removed = array.splice(0, 0, obj.objectCol);
        expect(removed.length).equals(0);
        expect(array.length).equals(1);

        removed = array.splice(1);
        expect(removed.length).equals(0);
        expect(array.length).equals(1);

        removed = array.splice(0);
        expect(removed.length).equals(1);
        expect(array.length).equals(0);

        //@ts-expect-error can not pass string that is non-convertible to number.
        expect(() => array.splice("cat", 1)).throws("Expected 'start' to be a number, got a string");

        //@ts-expect-error the third argument should not be a number.
        expect(() => array.splice(0, 0, 0)).throws("Expected 'element of arrayCol' to be an object, got a number");
      });
      expect(() => array.splice(0, 0, { doubleCol: 1 })).throws(
        "Cannot modify managed objects outside of a write transaction",
      );
    });
    it("supports deletions", function (this: RealmContext) {
      let object: ILinkTypeSchema;
      let array!: Realm.List<ITestObjectSchema>;

      this.realm.write(() => {
        object = this.realm.create<ILinkTypeSchema>(LinkTypeSchema.name, {
          objectCol: { doubleCol: 1 },
          objectCol1: { doubleCol: 2 },
          arrayCol: [{ doubleCol: 3 }, { doubleCol: 4 }],
        });

        array = object.arrayCol;
      });

      try {
        this.realm.write(() => {
          this.realm.delete(array[0]);
          expect(array.length).equals(1);
          expect(array[0].doubleCol).equals(4);

          // This should cancel the transaction and cause the list to be reset.
          throw new Error("Transaction FAIL");
        });
      } catch (e) {
        // Speech is silver, silence is golden
      }

      expect(array.length).equals(2);
      expect(array[0].doubleCol).equals(3);

      this.realm.write(() => {
        this.realm.delete(object);
      });

      expect(() => array[0]).throws(Error, "invalidated");
    });
    it("supports live updates", function (this: RealmContext) {
      const objects = this.realm.objects<ITestObjectSchema>("TestObject");
      let array!: Realm.List<ITestObjectSchema>;

      this.realm.write(() => {
        const obj = this.realm.create<ILinkTypeSchema>(LinkTypeSchema.name, {
          objectCol: { doubleCol: 1 },
          objectCol1: { doubleCol: 2 },
          arrayCol: [{ doubleCol: 3 }, { doubleCol: 4 }],
        });

        array = obj.arrayCol;
      });

      expect(array.length).equals(2);
      expect(objects.length).equals(4);

      try {
        this.realm.write(() => {
          array.push({ doubleCol: 5 });
          expect(objects.length).equals(5);

          array.unshift({ doubleCol: 2 });
          expect(objects.length).equals(6);

          array.splice(0, 0, { doubleCol: 1 });
          expect(objects.length).equals(7);

          array.push(objects[0], objects[1]);
          expect(objects.length).equals(7);

          // This should cancel the transaction and cause the list and results to be reset.
          throw new Error("Transaction FAIL");
        });
      } catch (e) {
        // Speech is silver, silence is golden
      }

      expect(array.length).equals(2);
      expect(objects.length).equals(4);
    });
    it("supports snapshots", function (this: RealmContext) {
      const objects = this.realm.objects<ITestObjectSchema>("TestObject");
      let array!: Realm.List<ITestObjectSchema>;

      this.realm.write(() => {
        const obj = this.realm.create<ILinkTypeSchema>(LinkTypeSchema.name, {
          objectCol: { doubleCol: 1 },
          objectCol1: { doubleCol: 2 },
          arrayCol: [{ doubleCol: 3 }, { doubleCol: 4 }],
          arrayCol1: [{ doubleCol: 5 }, { doubleCol: 6 }],
        });
        array = obj.arrayCol;
      });

      const objectsCopy = objects.snapshot();
      const arrayCopy = array.snapshot();

      expect(objectsCopy.length).equals(6);
      expect(arrayCopy.length).equals(2);

      this.realm.write(() => {
        array.push({ doubleCol: 5 });
        expect(objectsCopy.length).equals(6);
        expect(arrayCopy.length).equals(2);

        expect(objectsCopy.snapshot().length).equals(6);
        expect(arrayCopy.snapshot().length).equals(2);

        expect(objects.snapshot().length).equals(7);
        expect(array.snapshot().length).equals(3);

        this.realm.delete(array[0]);
        expect(objectsCopy.length).equals(6);
        expect(arrayCopy.length).equals(2);
        expect(arrayCopy[0]).equals(null);

        this.realm.deleteAll();
        expect(objectsCopy.length).equals(6);
        expect(arrayCopy.length).equals(2);
        expect(arrayCopy[1]).equals(null);
      });
    });
    it("supports isValid", function (this: RealmContext) {
      let object;
      let list!: Realm.List<IPersonSchema>;
      this.realm.write(() => {
        object = this.realm.create<IPersonListSchema>(PersonListSchema.name, {
          list: [
            { name: "Ari", age: 10 },
            { name: "Tim", age: 11 },
            { name: "Bjarne", age: 12 },
          ],
        });
        list = object.list;
        expect(list.isValid()).equals(true);
        this.realm.delete(object);
      });

      expect(list.isValid()).equals(false);
      expect(() => list.length).throws("invalidated");
    });
    it("supports isEmpty", function (this: RealmContext) {
      let object!: IPersonListSchema;
      this.realm.write(() => {
        object = this.realm.create<IPersonListSchema>(PersonListSchema.name, {
          list: [],
        });
      });
      expect(object.list.isEmpty()).to.be.true;

      this.realm.write(() => {
        object.list = [
          //@ts-expect-error TYPEBUG: assignment should not generate error as the other properties for Person are optional.
          { name: "Bob", age: 42 },
          //@ts-expect-error TYPEBUG: assignment should not generate error as the other properties for Person are optional.
          { name: "Alice", age: 42 },
        ];
      });
      expect(object.list.isEmpty()).to.be.false;
    });
  });
  describe("filters", () => {
    describe("sample", () => {
      openRealmBeforeEach({ schema: [PersonSchema, PersonListSchema] });
      it("returns correct results", function (this: RealmContext) {
        let list!: Realm.List<IPersonSchema>;

        this.realm.write(() => {
          const object = this.realm.create<IPersonListSchema>(PersonListSchema.name, {
            list: [
              { name: "Ari", age: 10 },
              { name: "Tim", age: 11 },
              { name: "Bjarne", age: 12 },
              { name: "Alex", age: 12, married: true },
            ],
          });
          this.realm.create("PersonObject", { name: "NotInList", age: 10 });

          list = object.list;
        });

        expect(list.filtered("truepredicate").length).equals(4);
        expect(list.filtered("age = 11")[0].name).equals("Tim");
        expect(list.filtered("age = 12").length).equals(2);
        expect(list.filtered("age > 10 && age < 13").length).equals(3);
        expect(list.filtered("age > 10").filtered("age < 13").length).equals(3);
      });
    });
    describe("uuid list sample", () => {
      openRealmBeforeEach({ schema: [UuidListSchema] });
      it("returns correct results", function (this: RealmContext) {
        this.realm.write(() => {
          this.realm.create(UuidListSchema.name, {
            _id: new BSON.UUID("afe99de1-c52a-4c6d-8d5a-b9df38d61b41"),
            list: [
              new BSON.UUID("64ecbcf8-0738-4451-87cb-bb38562f2377"),
              new BSON.UUID("06dbb9ee-8516-467a-9e1d-23d03d704537"),
              new BSON.UUID("f6f41949-d27e-48c0-a391-c74f0498c5e6"),
            ],
          });
          this.realm.create(UuidListSchema.name, {
            _id: new BSON.UUID("bd2050e8-f01c-4459-90d0-d16af35b9edc"),
            list: [
              new BSON.UUID("701fee43-e77b-4ab4-8224-0e0d8cedaafd"),
              new BSON.UUID("adbb2635-b61b-4a59-8f03-e97e847a5a14"),
              new BSON.UUID("f8aed1db-5b59-4f0f-9c9c-b48ea3cab73f"),
              new BSON.UUID("f9a9ab69-c04d-4b1c-b96b-27f829505704"),
              new BSON.UUID("5184ccf4-40f1-4748-a089-f64de6376907"),
            ],
          });
        });

        const listCountHit5 = this.realm.objects<IUuidListSchema>(UuidListSchema.name).filtered("list.@count == 5");
        expect(listCountHit5.length).equals(1, "'list.@count == 5' should only find one item");
        expect(listCountHit5[0]._id.toString()).equals("bd2050e8-f01c-4459-90d0-d16af35b9edc");

        const listDeepFilter = this.realm
          .objects<IUuidListSchema>(UuidListSchema.name)
          .filtered("ANY list == $0", new BSON.UUID("64ecbcf8-0738-4451-87cb-bb38562f2377"));
        expect(listDeepFilter.length).equals(
          1,
          "'ANY list == uuid(64ecbcf8-0738-4451-87cb-bb38562f2377)' should only find one item",
        );
        expect(listDeepFilter[0]._id.toString()).equals("afe99de1-c52a-4c6d-8d5a-b9df38d61b41");
      });
    });
    describe("sorted list", () => {
      openRealmBeforeEach({ schema: [TargetSchema, MidSchema, ListSchema, PrimitiveArraysSchema] });
      it("works on differentProperties", function (this: RealmContext) {
        let list!: Realm.List<IMidSchema>;
        let prim!: IPrimitiveArraysSchema;
        this.realm.write(() => {
          list = this.realm.create<IListSchema>(ListSchema.name, {
            list: [
              { value: 3, link: { value: 1 } },
              { value: 1, link: { value: 3 } },
              { value: 2, link: { value: 2 } },
            ],
          }).list;
          this.realm.create(ListSchema.name, { list: [{ value: 4, link: { value: 4 } }] });
          prim = this.realm.create<IPrimitiveArraysSchema>(PrimitiveArraysSchema.name, {
            bool: [true, false],
            int: [3, 1, 2],
            float: [3, 1, 2],
            double: [3, 1, 2],
            string: ["c", "a", "b"],
            data: [DATA3, DATA1, DATA2],
            date: [DATE3, DATE1, DATE2],
            objectId: [
              new BSON.ObjectId("0000002a9a7969d24bea4cf2"),
              new BSON.ObjectId("0000002a9a7969d24bea4cf3"),
              new BSON.ObjectId("0000002a9a7969d24bea4cf4"),
            ],
            uuid: [
              new BSON.UUID("a4078b20-7b0c-4de4-929c-4cc1c7d8345f"),
              new BSON.UUID("c16d38bf-28f2-4a3a-9817-e0f45ffce68a"),
              new BSON.UUID("b7821fd0-38cf-4f94-8650-d0f5b6295ef4"),
            ],
            optBool: [true, false, null],
            optInt: [3, 1, 2, null],
            optFloat: [3, 1, 2, null],
            optDouble: [3, 1, 2, null],
            optString: ["c", "a", "b", null],
            optData: [DATA3, DATA1, DATA2, null],
            optDate: [DATE3, DATE1, DATE2, null],
            optObjectId: [
              new BSON.ObjectId("0000002a9a7969d24bea4cf2"),
              new BSON.ObjectId("0000002a9a7969d24bea4cf4"),
              new BSON.ObjectId("0000002a9a7969d24bea4cf3"),
              null,
            ],
            optUuid: [
              new BSON.UUID("a4078b20-7b0c-4de4-929c-4cc1c7d8345f"),
              new BSON.UUID("c16d38bf-28f2-4a3a-9817-e0f45ffce68a"),
              new BSON.UUID("b7821fd0-38cf-4f94-8650-d0f5b6295ef4"),
              null,
            ],
          });
        });

        const values = (results: Realm.Results<IMidSchema>) => results.map((o) => o.value);

        // TestCase.assertThrowsContaining(() => list.sorted());
        expect(() => list.sorted("nonexistent property")).throws(
          "Cannot sort on key path 'nonexistent property': property 'Mid.nonexistent property' does not exist.",
        );
        expect(() => list.sorted("link")).throws(
          "Cannot sort on key path 'link': property 'Mid.link' of type 'object' cannot be the final property in the key path.",
        );

        expectArraysEqual(values(list.sorted([])), [3, 1, 2]);

        expectArraysEqual(values(list.sorted("value")), [1, 2, 3]);
        expectArraysEqual(values(list.sorted("value", false)), [1, 2, 3]);
        expectArraysEqual(values(list.sorted("value", true)), [3, 2, 1]);
        expectArraysEqual(values(list.sorted(["value"])), [1, 2, 3]);
        expectArraysEqual(values(list.sorted([["value", false]])), [1, 2, 3]);
        expectArraysEqual(values(list.sorted([["value", true]])), [3, 2, 1]);

        expectArraysEqual(values(list.sorted("link.value")), [3, 2, 1]);
        expectArraysEqual(values(list.sorted("link.value", false)), [3, 2, 1]);
        expectArraysEqual(values(list.sorted("link.value", true)), [1, 2, 3]);
        expectArraysEqual(values(list.sorted(["link.value"])), [3, 2, 1]);
        expectArraysEqual(values(list.sorted([["link.value", false]])), [3, 2, 1]);
        expectArraysEqual(values(list.sorted([["link.value", true]])), [1, 2, 3]);

        expect(() => prim.int.sorted("value", true)).throws(
          "Cannot sort on key path 'value': arrays of 'int' can only be sorted on 'self'",
        );
        expect(() => prim.int.sorted("!ARRAY_VALUE", true)).throws(
          "Cannot sort on key path '!ARRAY_VALUE': arrays of 'int' can only be sorted on 'self'",
        );

        expectArraysEqual(prim.int.sorted([]), [3, 1, 2]);
        expectArraysEqual(prim.int.sorted(), [1, 2, 3]);
        expectArraysEqual(prim.int.sorted(false), [1, 2, 3]);
        expectArraysEqual(prim.int.sorted(true), [3, 2, 1]);

        expectArraysEqual(prim.optInt.sorted([]), [3, 1, 2, null]);
        expectArraysEqual(prim.optInt.sorted(), [null, 1, 2, 3]);
        expectArraysEqual(prim.optInt.sorted(false), [null, 1, 2, 3]);
        expectArraysEqual(prim.optInt.sorted(true), [3, 2, 1, null]);

        expectArraysEqual(prim.bool.sorted(), [false, true]);
        expectArraysEqual(prim.float.sorted(), [1, 2, 3]);
        expectArraysEqual(prim.double.sorted(), [1, 2, 3]);
        expectArraysEqual(prim.string.sorted(), ["a", "b", "c"]);
        expectArraysEqual(prim.data.sorted(), [DATA1, DATA2, DATA3]);
        expectArraysEqual(prim.date.sorted(), [DATE1, DATE2, DATE3]);
        expectArraysEqual(prim.optBool.sorted(), [null, false, true]);
        expectArraysEqual(prim.optFloat.sorted(), [null, 1, 2, 3]);
        expectArraysEqual(prim.optDouble.sorted(), [null, 1, 2, 3]);
        expectArraysEqual(prim.optString.sorted(), [null, "a", "b", "c"]);
        expectArraysEqual(prim.optData.sorted(), [null, DATA1, DATA2, DATA3]);
        expectArraysEqual(prim.optDate.sorted(), [null, DATE1, DATE2, DATE3]);

        expectArraysEqual(prim.objectId.sorted(), [
          new BSON.ObjectId("0000002a9a7969d24bea4cf2"),
          new BSON.ObjectId("0000002a9a7969d24bea4cf3"),
          new BSON.ObjectId("0000002a9a7969d24bea4cf4"),
        ]);
        expectArraysEqual(prim.objectId.sorted(true), [
          new BSON.ObjectId("0000002a9a7969d24bea4cf4"),
          new BSON.ObjectId("0000002a9a7969d24bea4cf3"),
          new BSON.ObjectId("0000002a9a7969d24bea4cf2"),
        ]);

        expectArraysEqual(prim.uuid.sorted(), [
          new BSON.UUID("a4078b20-7b0c-4de4-929c-4cc1c7d8345f"),
          new BSON.UUID("b7821fd0-38cf-4f94-8650-d0f5b6295ef4"),
          new BSON.UUID("c16d38bf-28f2-4a3a-9817-e0f45ffce68a"),
        ]);
        expectArraysEqual(prim.uuid.sorted(true), [
          new BSON.UUID("c16d38bf-28f2-4a3a-9817-e0f45ffce68a"),
          new BSON.UUID("b7821fd0-38cf-4f94-8650-d0f5b6295ef4"),
          new BSON.UUID("a4078b20-7b0c-4de4-929c-4cc1c7d8345f"),
        ]);

        expectArraysEqual(prim.optObjectId.sorted(), [
          null,
          new BSON.ObjectId("0000002a9a7969d24bea4cf2"),
          new BSON.ObjectId("0000002a9a7969d24bea4cf3"),
          new BSON.ObjectId("0000002a9a7969d24bea4cf4"),
        ]);
        expectArraysEqual(prim.optObjectId.sorted(true), [
          new BSON.ObjectId("0000002a9a7969d24bea4cf4"),
          new BSON.ObjectId("0000002a9a7969d24bea4cf3"),
          new BSON.ObjectId("0000002a9a7969d24bea4cf2"),
          null,
        ]);

        expectArraysEqual(prim.optUuid.sorted(), [
          null,
          new BSON.UUID("a4078b20-7b0c-4de4-929c-4cc1c7d8345f"),
          new BSON.UUID("b7821fd0-38cf-4f94-8650-d0f5b6295ef4"),
          new BSON.UUID("c16d38bf-28f2-4a3a-9817-e0f45ffce68a"),
        ]);
        expectArraysEqual(prim.optUuid.sorted(true), [
          new BSON.UUID("c16d38bf-28f2-4a3a-9817-e0f45ffce68a"),
          new BSON.UUID("b7821fd0-38cf-4f94-8650-d0f5b6295ef4"),
          new BSON.UUID("a4078b20-7b0c-4de4-929c-4cc1c7d8345f"),
          null,
        ]);
      });
    });
  });
  describe("array-methods", () => {
    openRealmBeforeEach({ schema: [PersonSchema, PersonListSchema, PrimitiveArrays] });
    it("works on differentProperties", function (this: RealmContext) {
      let object!: IPersonListSchema;
      let prim!: PrimitiveArrays;

      this.realm.write(() => {
        object = this.realm.create<IPersonListSchema>(PersonListSchema.name, {
          list: [
            { name: "Ari", age: 10 },
            { name: "Tim", age: 11 },
            { name: "Bjarne", age: 12 },
          ],
        });
        prim = this.realm.create(PrimitiveArrays, { int: [10, 11, 12] });
      });

      for (const list of [object.list, this.realm.objects<IPersonListSchema>(PersonSchema.name)]) {
        expect(list.slice().length).equals(3);
        expect(list.slice(-1).length).equals(1);
        expect((list.slice(-1)[0] as IPersonSchema).age).equals(12);
        expect(list.slice(1, 3).length).equals(2);
        expect((list.slice(1, 3)[1] as IPersonSchema).age).equals(12);
        expect(list.map((p) => p.name).join(" ")).equals("Ari Tim Bjarne");

        let count = 0;
        list.forEach((p, i) => {
          expect(p.name).equals(list[i].name);
          count++;
        });
        expect(count).equals(list.length);

        expectArraysEqual(
          list.map((p) => p.age),
          [10, 11, 12],
        );
        expect(list.some((p) => p.age > 10)).is.true;
        expect(list.every((p) => p.age > 0)).is.true;

        const person = list.find((p) => p.name == "Tim");
        expect(person?.name).equals("Tim");

        const index = list.findIndex((p) => p.name == "Tim");
        expect(index).equals(1);
        expect(list.indexOf(list[index])).equals(index);

        expect(list.reduce((n, p) => n + p.age, 0)).equals(33);
        expect(list.reduceRight((n, p) => n + p.age, 0)).equals(33);

        // eslint-disable-next-line no-undef
        const iteratorMethodNames: (string | symbol)[] = ["entries", "keys", "values"];

        iteratorMethodNames.push(Symbol.iterator);

        iteratorMethodNames.forEach((methodName) => {
          //@ts-expect-error TYPEBUG: our List type-definition expects index accesses to be done with a number , should probably be extended.
          const iterator = list[methodName]();
          let count = 0;
          let result;

          // This iterator should itself be iterable.
          // TestCase.assertEqual(iterator[iteratorSymbol](), iterator);
          expect(iterator[Symbol.iterator]()).equals(iterator);

          while ((result = iterator.next()) && !result.done) {
            const value = result.value;

            switch (methodName) {
              case "entries":
                expect(value.length).equals(2);
                expect(value[0]).equals(count);
                expect(value[1].name).equals(list[count].name);
                break;
              case "keys":
                expect(value).equals(count);
                break;
              default:
                expect(value.name).equals(list[count].name);
                break;
            }

            count++;
          }

          expect(result.done).equals(true);
          expect(result.value).equals(undefined);
          expect(count).equals(list.length);
        });
      }

      const list: Realm.List<number> = prim.int;
      expect(list.slice().length).equals(3);
      expect(list.slice(-1).length).equals(1);
      expect(list.slice(-1)[0]).equals(12);
      expect(list.slice(1, 3).length).equals(2);
      expect(list.slice(1, 3)[1]).equals(12);

      expect(list.join(" ")).equals("10 11 12");

      let count = 0;
      list.forEach((v, i) => {
        expect(v).equals(i + 10);
        count++;
      });
      expect(count).equals(list.length);

      expectArraysEqual(
        list.map((p) => p + 1),
        [11, 12, 13],
      );
      expect(list.some((p) => p > 10)).to.be.true;
      expect(list.every((p) => p > 0)).to.be.true;

      const value = list.find((p) => p == 11);
      expect(value).equals(11);

      const index = list.findIndex((p) => p == 11);
      expect(index).equals(1);
      expect(list.indexOf(list[index])).equals(index);

      expect(list.reduce((n, p) => n + p, 0)).equals(33);
      expect(list.reduceRight((n, p) => n + p, 0)).equals(33);

      // eslint-disable-next-line no-undef
      const iteratorMethodNames: (string | symbol)[] = ["entries", "keys", "values"];

      iteratorMethodNames.push(Symbol.iterator);

      iteratorMethodNames.forEach((methodName) => {
        //@ts-expect-error TYPEBUG: our List type-definition expects index accesses to be done with a number , should probably be extended.
        const iterator = list[methodName]();
        let count = 0;
        let result;

        // This iterator should itself be iterable.
        // TestCase.assertEqual(iterator[iteratorSymbol](), iterator);
        expect(iterator[Symbol.iterator]()).equals(iterator);

        while ((result = iterator.next()) && !result.done) {
          const value = result.value;

          switch (methodName) {
            case "entries":
              expect(value.length).equals(2);
              expect(value[0]).equals(count);
              expect(value[1]).equals(list[count]);
              break;
            case "keys":
              expect(value).equals(count);
              break;
            default:
              //@ts-expect-error TYPEBUG: this compares undefined with undefined which doesn't give too much.
              expect(value.name).equals(list[count].name);
              break;
          }

          count++;
        }

        expect(result.done).equals(true);
        expect(result.value).equals(undefined);
        expect(count).equals(list.length);
      });
    });
  });
  describe("aggregates", () => {
    openRealmBeforeEach({
      schema: [
        NullableBasicTypesSchema,
        NullableBasicTypesListSchema,
        PrimitiveArraysSchema,
        PersonSchema,
        PersonListSchema,
      ],
    });
    it("supports aggregation on properties of objects", function (this: RealmContext) {
      const N = 50;
      const list: { intCol: number; floatCol: number; doubleCol: number; dateCol: Date }[] = [];
      for (let i = 0; i < N; i++) {
        list.push({
          intCol: i + 1,
          floatCol: i + 1,
          doubleCol: i + 1,
          dateCol: new Date(i + 1),
        });
      }

      let object!: INullableBasicTypesListSchema;
      this.realm.write(() => {
        object = this.realm.create<INullableBasicTypesListSchema>(NullableBasicTypesListSchema.name, {
          list: list,
        });
      });

      expect(object.list.length).equals(N);

      // int, float & double columns support all aggregate functions
      ["intCol", "floatCol", "doubleCol"].forEach((colName) => {
        expect(object.list.min(colName)).equals(1);
        expect(object.list.max(colName)).equals(N);
        expect(object.list.sum(colName)).equals((N * (N + 1)) / 2);
        expect(object.list.avg(colName)).equals((N + 1) / 2);
      });

      // date columns support only 'min' & 'max'
      expect((object.list.min("dateCol") as Date).getTime()).equals(new Date(1).getTime());
      expect((object.list.max("dateCol") as Date).getTime()).equals(new Date(N).getTime());
    });
    it("supports aggregation on properties of objects with null values", function (this: RealmContext) {
      const N = 50;
      const M = 10;

      const list: { intCol?: number; floatCol?: number; doubleCol?: number; dateCol?: Date }[] = [];
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

      let object!: INullableBasicTypesListSchema;
      let objectEmptyList!: INullableBasicTypesListSchema;
      this.realm.write(() => {
        object = this.realm.create<INullableBasicTypesListSchema>(NullableBasicTypesListSchema.name, { list: list });
        objectEmptyList = this.realm.create<INullableBasicTypesListSchema>(NullableBasicTypesListSchema.name, {
          list: [],
        });
      });

      expect(object.list.length).equals(N + M);

      // int, float & double columns support all aggregate functions
      // the M null valued objects should be ignored
      ["intCol", "floatCol", "doubleCol"].forEach((colName) => {
        expect(object.list.min(colName)).equals(1);
        expect(object.list.max(colName)).equals(N);
        expect(object.list.sum(colName)).equals((N * (N + 1)) / 2);
        expect(object.list.avg(colName)).equals((N + 1) / 2);
      });

      // date columns support only 'min' & 'max'
      expect((object.list.min("dateCol") as Date).getTime()).equals(new Date(1).getTime());
      expect((object.list.max("dateCol") as Date).getTime()).equals(new Date(N).getTime());

      // call aggregate functions on empty list
      expect(objectEmptyList.list.length).equals(0);
      ["intCol", "floatCol", "doubleCol"].forEach((colName) => {
        expect(objectEmptyList.list.min(colName)).to.be.undefined;
        expect(objectEmptyList.list.max(colName)).to.be.undefined;
        expect(objectEmptyList.list.sum(colName)).equals(0);
        expect(objectEmptyList.list.avg(colName)).to.be.undefined;
      });

      expect(objectEmptyList.list.min("dateCol")).to.be.undefined;
      expect(objectEmptyList.list.max("dateCol")).to.be.undefined;
    });
    it("supports primitive list aggregation functions", function (this: RealmContext) {
      let object!: IPrimitiveArraysSchema;
      this.realm.write(() => {
        object = this.realm.create<IPrimitiveArraysSchema>(PrimitiveArraysSchema.name, {
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

      for (const prop of ["int", "float", "double", "date", "optInt", "optFloat", "optDouble", "optDate"]) {
        //@ts-expect-error TYPEBUG: our List type-definition expects index accesses to be done with a number , should probably be extended.
        const list = object[prop];
        expectSimilar(list.type, list.min(), list[0]);
        expectSimilar(list.type, list.max(), list[2]);

        if (list.type === "date") {
          const optional = prop.startsWith("opt") ? "?" : "";
          expect(() => list.sum()).throws(
            `Operation 'sum' not supported for date${optional} list 'PrimitiveArrays.${prop}'`,
          );
          expect(() => list.avg()).throws(
            `Operation 'average' not supported for date${optional} list 'PrimitiveArrays.${prop}'`,
          );
          continue;
        }

        const sum = list[0] + list[1] + list[2];
        const avg = sum / (list[1] === null ? 2 : 3);
        expectSimilar(list.type, list.sum(), sum);
        expectSimilar(list.type, list.avg(), avg);
      }

      expect(() => object.bool.min()).throws("Operation 'min' not supported for bool list 'PrimitiveArrays.bool'");
      expect(() => object.int.min("foo")).throws(Error, "Cannot get property named 'foo' on a list of primitives");
    });
    it("throws on unsupported aggregate operations", function (this: RealmContext) {
      const N = 5;

      const list: { intCol: number; floatCol: number; doubleCol: number; dateCol: Date }[] = [];
      for (let i = 0; i < N; i++) {
        list.push({
          intCol: i + 1,
          floatCol: i + 1,
          doubleCol: i + 1,
          dateCol: new Date(i + 1),
        });
      }

      let object!: INullableBasicTypesListSchema;
      this.realm.write(() => {
        object = this.realm.create<INullableBasicTypesListSchema>(NullableBasicTypesListSchema.name, { list: list });
      });

      expect(object.list.length).equals(N);

      // bool, string & data columns don't support 'min'
      ["bool", "string", "data"].forEach((colName) => {
        expect(() => object.list.min(colName + "Col")).throws(
          `Operation 'min' not supported for ${colName}? property 'NullableBasicTypesObject.${colName}Col'`,
        );
      });

      // bool, string & data columns don't support 'max'
      ["bool", "string", "data"].forEach((colName) => {
        expect(() => object.list.max(colName + "Col")).throws(
          `Operation 'max' not supported for ${colName}? property 'NullableBasicTypesObject.${colName}Col'`,
        );
      });

      // bool, string, date & data columns don't support 'avg'
      ["bool", "string", "date", "data"].forEach((colName) => {
        expect(() => object.list.avg(colName + "Col")).throws(
          `Operation 'average' not supported for ${colName}? property 'NullableBasicTypesObject.${colName}Col'`,
        );
      });

      // bool, string, date & data columns don't support 'sum'
      ["bool", "string", "date", "data"].forEach((colName) => {
        expect(() => object.list.sum(colName + "Col")).throws(
          `Operation 'sum' not supported for ${colName}? property 'NullableBasicTypesObject.${colName}Col'`,
        );
      });
    });
    it("throws on aggregate on non existing property", function (this: RealmContext) {
      let object!: IPersonListSchema;
      this.realm.write(() => {
        object = this.realm.create<IPersonListSchema>(PersonListSchema.name, {
          list: [
            { name: "Ari", age: 10 },
            { name: "Tim", age: 11 },
            { name: "Bjarne", age: 12 },
          ],
        });
      });

      expect(() => object.list.min("foo")).throws("Property 'foo' does not exist on 'PersonObject' objects");
      expect(() => object.list.max("foo")).throws("Property 'foo' does not exist on 'PersonObject' objects");
      expect(() => object.list.sum("foo")).throws("Property 'foo' does not exist on 'PersonObject' objects");
      expect(() => object.list.avg("foo")).throws("Property 'foo' does not exist on 'PersonObject' objects");
      expect(() => object.list.min()).throws("Expected 'name' to be a string, got undefined");
      expect(() => object.list.max()).throws("Expected 'name' to be a string, got undefined");
      expect(() => object.list.sum()).throws("Expected 'name' to be a string, got undefined");
      expect(() => object.list.avg()).throws("Expected 'name' to be a string, got undefined");
    });
  });
  describe("complex list forms", () => {
    openRealmBeforeEach({
      schema: [
        ParentObjectSchema,
        NameObjectSchema,
        ParentObjectLocalSchema,
        NameObjectLocalSchema,
        MultiListObjectSchema,
      ],
    });
    it("supports nested lists", function (this: RealmContext) {
      this.realm.write(() => {
        this.realm.create(ParentObjectSchema.name, {
          id: 1,
          _id: new BSON.ObjectId(),
          name: [
            { _id: new BSON.ObjectId(), family: "Larsen", given: ["Hans", "Jørgen"], prefix: [] },
            { _id: new BSON.ObjectId(), family: "Hansen", given: ["Ib"], prefix: [] },
          ],
        });
        this.realm.create(ParentObjectSchema.name, {
          id: 2,
          _id: new BSON.ObjectId(),
          name: [{ _id: new BSON.ObjectId(), family: "Petersen", given: ["Gurli", "Margrete"], prefix: [] }],
        });

        // Test that we can push a created object on a list
        const name = this.realm.create<INameObjectSchema>(NameObjectSchema.name, {
          _id: new BSON.ObjectId(),
          family: "Larsen",
          given: ["Lars"],
          prefix: [],
        });
        const person = this.realm.create<IParentObjectSchema>(ParentObjectSchema.name, {
          id: 3,
          _id: new BSON.ObjectId(),
          name: [],
        });
        person.name.push(name);
      });

      const objects = this.realm.objects<IParentObjectSchema>(ParentObjectSchema.name).sorted([["id", false]]);
      expect(objects.length).equals(3);
      expect(objects[0].name.length).equals(2);
      expect(objects[0].name[0].given.length).equals(2);
      expect(objects[0].name[0].prefix.length).equals(0);
      expect(objects[0].name[0].given[0]).equals("Hans");
      expect(objects[0].name[0].given[1]).equals("Jørgen");
      expect(objects[0].name[1].given.length).equals(1);
      expect(objects[0].name[1].given[0]).equals("Ib");
      expect(objects[0].name[1].prefix.length).equals(0);

      expect(objects[1].name.length).equals(1);
      expect(objects[1].name[0].given.length).equals(2);
      expect(objects[1].name[0].prefix.length).equals(0);
      expect(objects[1].name[0].given[0]).equals("Gurli");
      expect(objects[1].name[0].given[1]).equals("Margrete");

      expect(objects[2].name.length).equals(1);
      expect(objects[2].name[0].given.length).equals(1);
      expect(objects[2].name[0].prefix.length).equals(0);
      expect(objects[2].name[0].given[0]).equals("Lars");
      expect(objects[2].name[0].family).equals("Larsen");
    });
    it("supports nested lists from parsed JSON", function (this: RealmContext) {
      const json =
        '{"id":1, "name": [{ "family": "Larsen", "given": ["Hans", "Jørgen"], "prefix": [] }, { "family": "Hansen", "given": ["Ib"], "prefix": [] }] }';
      const parent = JSON.parse(json);
      this.realm.write(() => {
        this.realm.create<IParentObjectLocalSchema>(ParentObjectLocalSchema.name, parent);
      });

      const objects = this.realm.objects<IParentObjectLocalSchema>(ParentObjectLocalSchema.name);
      expect(objects.length).equals(1);
      expect(objects[0].name.length).equals(2);
      expect(objects[0].name[0].given.length).equals(2);
      expect(objects[0].name[0].prefix.length).equals(0);
      expect(objects[0].name[0].given[0]).equals("Hans");
      expect(objects[0].name[0].given[1]).equals("Jørgen");

      expect(objects[0].name[1].given.length).equals(1);
      expect(objects[0].name[1].prefix.length).equals(0);
      expect(objects[0].name[1].given[0]).equals("Ib");
    });
    it("supports multiple lists", function (this: RealmContext) {
      this.realm.write(() => {
        this.realm.create(MultiListObjectSchema.name, { id: 0, list1: ["Hello"], list2: ["World"] });
        this.realm.create(MultiListObjectSchema.name, { id: 1, list1: ["Foo"], list2: ["Bar"] });
      });

      const objects = this.realm.objects<IMultiListObjectSchema>(MultiListObjectSchema.name);
      expect(objects.length).equals(2);
      expect(objects[0].id).equals(0);
      expect(objects[0].list1.length).equals(1);
      expect(objects[0].list1[0]).equals("Hello");
      expect(objects[0].list2.length).equals(1);
      expect(objects[0].list2[0]).equals("World");
      expect(objects[1].id).equals(1);
      expect(objects[1].list1.length).equals(1);
      expect(objects[1].list1[0]).equals("Foo");
      expect(objects[1].list2.length).equals(1);
      expect(objects[1].list2[0]).equals("Bar");
    });
  });
  describe("Schema with list", () => {
    it("supports get and apply schema", function () {
      //@ts-expect-error TYPEBUG: should add _cache as a field to interface "Configuration" if it's publicly consumed.
      const realm1 = new Realm({
        schema: [NameObjectLocalSchema],
        _cache: false,
      });
      realm1.write(() => {
        realm1.create(NameObjectLocalSchema.name, { family: "Smith", given: ["Bob", "Ted"] });
      });
      const schema = realm1.schema;
      realm1.close();

      //@ts-expect-error TYPEBUG: should add _cache as a field to interface "Configuration" if it's publicly consumed.
      const realm2 = new Realm({
        schema: schema,
        _cache: false,
      });
      const names = realm2.objects(NameObjectLocalSchema.name);
      expect(names.length).equals(1);
      //@ts-expect-error TYPEBUG: our List type-definition expects index accesses to be done with a number , should probably be extended.
      expect(names[0]["family"]).equals("Smith");
      //@ts-expect-error TYPEBUG: our List type-definition expects index accesses to be done with a number , should probably be extended.
      expect(names[0]["given"].length).equals(2);
      realm2.close();
    });
  });
  describe("list of embedded objects", () => {
    openRealmBeforeEach({
      schema: [
        ContactSchema,
        AddressSchema,
        HouseOwnerSchema,
        ScoutDivisionSchema,
        ScoutGroupSchema,
        ScoutBranchSchema,
      ],
    });
    it("supports creating embedded objects", function () {
      this.realm.write(() => {
        this.realm.create(ContactSchema.name, {
          name: "Freddy Krueger",
          address: { street: "Elm Street", city: "Springwood" },
        });
      });

      expect(this.realm.objects(ContactSchema.name).length).equals(1);
      expect(this.realm.objects(ContactSchema.name)[0]["address"]["street"]).equals("Elm Street");

      this.realm.write(() => {
        this.realm.create(ContactSchema.name, { name: "John Doe" });
      });

      const contacts = this.realm.objects(ContactSchema.name);
      expect(contacts.length).equals(2);
      expect(contacts[0]["address"]["street"]).equals("Elm Street");
      expect(contacts[1]["address"]).to.be.null;
    });
    it("supports creating multiple embedded objects", function () {
      this.realm.write(() => {
        this.realm.create(HouseOwnerSchema.name, {
          name: "Ib",
          addresses: [
            { street: "Algade", city: "Nordby" },
            { street: "Skolevej", city: "Sydpynten" },
          ],
        });
        this.realm.create(HouseOwnerSchema.name, {
          name: "Petra",
          addresses: [{ street: "Algade", city: "Nordby" }],
        });
        this.realm.create(HouseOwnerSchema.name, { name: "Hans" });
      });

      const owners = this.realm.objects(HouseOwnerSchema.name).sorted("name");
      expect(owners.length).equals(3);
      let expectedLength = [0, 2, 1]; // sorted: "Hans", "Ib", "Petra"
      for (let i = 0; i < expectedLength.length; i++) {
        expect(owners[i]["addresses"].length).equals(expectedLength[i]);
      }

      const names = ["Hans", "Ib", "Petra"];
      for (let i = 0; i < names.length; i++) {
        expect(owners[i]["name"]).equals(names[i]);
      }

      // insert an extra address into Hans's list (add embedded object)
      const hans_addrs = owners[0].addresses;
      this.realm.write(() => {
        hans_addrs.push({ street: "Njalsgade", city: "Islands Brygge" });
      });

      expectedLength = [1, 2, 1];
      for (let i = 0; i < expectedLength.length; i++) {
        expect(owners[i]["addresses"].length).equals(expectedLength[i]);
      }

      // remove the last of Hans' addresses
      this.realm.write(() => {
        hans_addrs.pop();
      });

      expectedLength = [0, 2, 1];
      for (let i = 0; i < expectedLength.length; i++) {
        expect(owners[i]["addresses"].length).equals(expectedLength[i]);
      }
    });
    it("supports creating nested embedded objects", function () {
      this.realm.write(() => {
        this.realm.create(ScoutDivisionSchema.name, {
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
        this.realm.create(ScoutDivisionSchema.name, {
          name: "Bernstorff Division",
          groups: [
            {
              name: "HellerupSpejderne",
              branches: [{ name: "Mini" }, { name: "Flok" }, { name: "Klan" }],
            },
          ],
        });
      });

      const divisions = this.realm.objects(ScoutDivisionSchema.name).sorted("name");
      expect(divisions.length).equals(2);

      const bernstorff_groups = divisions[0].groups;
      expect(bernstorff_groups.length).equals(1);

      // add a Group to Bernstorff Division
      this.realm.write(() => {
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
      expect(divisions[0]["groups"].length).equals(2);
    });
    it("creating standalone embedded object throws", function () {
      // creating standalone embedded object is not allowed
      this.realm.write(() => {
        expect(() => {
          this.realm.create(AddressSchema.name, { street: "Njalsgade", city: "Islands Brygge" });
        }).throws(Error);
      });
    });
    it("supports adding embedded objects", function () {
      this.realm.write(() => {
        this.realm.create(HouseOwnerSchema.name, {
          name: "Ib",
          addresses: [
            { street: "Algade", city: "Nordby" },
            { street: "Skolevej", city: "Sydpynten" },
          ],
        });
      });

      const ib = this.realm.objectForPrimaryKey(HouseOwnerSchema.name, "Ib");
      expect(ib.addresses.length).equals(2);

      this.realm.write(() => {
        expect(() => {
          //standalone object throws
          this.realm.create(AddressSchema.name, { street: "Njalsgade", city: "Islands Brygge" });
        }).throws(Error);

        ib.addresses.push({ street: "Njalsgade", city: "Islands Brygge" });
        expect(3).equals(ib.addresses.length);
      });
    });
    it("querying embedded objects throws", function () {
      expect(() => {
        this.realm.objects(AddressSchema.name);
      }).throws(Error);
    });
  });
  describe("objects and classes", () => {
    openRealmBeforeEach({ schema: [TodoList, TodoItem] });
    it("supports constructing objects with lists and pushing objects to it", function () {
      this.realm.write(() => {
        const list = this.realm.create(TodoList, {
          name: "MyTodoList",
        });

        list.items.push(new TodoItem(this.realm, "Fix that bug"));
        this.realm.create(TodoItem, new TodoItem(this.realm, "Fix that bug"));
      });
    });
  });

  type Item<T = unknown> = { list: Realm.List<T> };

  describe("with unconstrained (mixed) values", () => {
    openRealmBefore({
      schema: [
        {
          name: "Item",
          properties: { list: { type: "list", objectType: "mixed" } },
        },
      ],
    });

    it("supports remove", function (this: RealmContext) {
      const { list } = this.realm.write(() =>
        this.realm.create<Item>("Item", {
          list: [2, 5, 8, 14, 57],
        }),
      );

      expect([...list]).deep.equals([2, 5, 8, 14, 57]);

      this.realm.write(() => {
        list.remove(0);
      });

      expect([...list]).deep.equals([5, 8, 14, 57]);

      this.realm.write(() => {
        list.remove(3);
      });

      expect([...list]).deep.equals([5, 8, 14]);

      this.realm.write(() => {
        expect(() => list.remove(-1)).to.throw("Index cannot be smaller than 0");
        expect(() => list.remove(10)).to.throw("Index cannot be greater than the size of the list");
      });
    });

    it("supports move", function (this: RealmContext) {
      const { list } = this.realm.write(() =>
        this.realm.create<Item>("Item", {
          list: [2, 5, 8, 14, 57],
        }),
      );

      expect([...list]).deep.equals([2, 5, 8, 14, 57]);

      this.realm.write(() => {
        list.move(0, 3);
      });

      expect([...list]).deep.equals([5, 8, 14, 2, 57]);

      this.realm.write(() => {
        list.move(2, 1);
      });

      expect([...list]).deep.equals([5, 14, 8, 2, 57]);

      this.realm.write(() => {
        expect(() => list.move(-1, 3)).to.throw("Indexes cannot be smaller than 0");
        expect(() => list.move(3, -1)).to.throw("Indexes cannot be smaller than 0");
        expect(() => list.move(1, 10)).to.throw("Indexes cannot be greater than the size of the list");
        expect(() => list.move(10, 1)).to.throw("Indexes cannot be greater than the size of the list");
      });
    });

    it("supports swap", function (this: RealmContext) {
      const { list } = this.realm.write(() =>
        this.realm.create<Item>("Item", {
          list: [2, 5, 8, 14, 57],
        }),
      );

      expect([...list]).deep.equals([2, 5, 8, 14, 57]);

      this.realm.write(() => {
        list.swap(0, 3);
      });

      expect([...list]).deep.equals([14, 5, 8, 2, 57]);

      this.realm.write(() => {
        list.swap(2, 1);
      });

      expect([...list]).deep.equals([14, 8, 5, 2, 57]);

      this.realm.write(() => {
        expect(() => list.swap(-1, 3)).to.throw("Indexes cannot be smaller than 0");
        expect(() => list.swap(3, -1)).to.throw("Indexes cannot be smaller than 0");
        expect(() => list.swap(1, 10)).to.throw("Indexes cannot be greater than the size of the list");
        expect(() => list.swap(10, 1)).to.throw("Indexes cannot be greater than the size of the list");
      });
    });
  });
});
