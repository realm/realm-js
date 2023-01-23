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
import Realm from "realm";
import { expect } from "chai";
const { Decimal128, ObjectId, UUID } = Realm.BSON;

interface SchemaWithPropertyArray extends Omit<Realm.ObjectSchema, "properties"> {
  properties: { name: string; type: string; objectType?: string; optional?: boolean }[];
}

interface TestCase {
  schema: SchemaWithPropertyArray[];
  objects: {
    type: string;
    value: any[];
  }[];
  tests: [TestType: string, ObjectType: string, ...TestTypeArgs: Array<any>][];
}

const SharedTestSuiteCases: Record<string, TestCase> = {
  dateTests: {
    schema: [{ name: "DateObject", properties: [{ name: "dateCol", type: "date" }] }],
    objects: [
      { type: "DateObject", value: [0] },
      { type: "DateObject", value: [1] },
      { type: "DateObject", value: [2] },
    ],
    tests: [
      ["AssertLength", "DateObject", 2, "dateCol < $0", [2, "dateCol"]],
      ["AssertLength", "DateObject", 3, "dateCol <= $0", [2, "dateCol"]],
      ["AssertLength", "DateObject", 2, "dateCol > $0", [0, "dateCol"]],
      ["AssertLength", "DateObject", 3, "dateCol >= $0", [0, "dateCol"]],
      ["AssertLength", "DateObject", 1, "dateCol == $0", [0, "dateCol"]],
      ["AssertLength", "DateObject", 2, "dateCol != $0", [0, "dateCol"]],

      ["AssertException", "DateObject", "Unsupported comparison between type", "dateCol == 'not a date'"],
      ["AssertException", "DateObject", "Unsupported comparison between type", "dateCol == 1"],
      ["AssertException", "DateObject", "Unsupported comparison between type", "dateCol == $0", 1],
    ],
  },

  boolTests: {
    schema: [{ name: "BoolObject", properties: [{ name: "boolCol", type: "bool" }] }],
    objects: [
      { type: "BoolObject", value: [false] },
      { type: "BoolObject", value: [true] },
      { type: "BoolObject", value: [true] },
    ],
    tests: [
      ["AssertLength", "BoolObject", 2, "boolCol == true"],
      ["AssertLength", "BoolObject", 1, "boolCol==false"],
      ["AssertLength", "BoolObject", 1, "boolCol != true"],
      ["AssertLength", "BoolObject", 2, "true == boolCol"],
      ["AssertLength", "BoolObject", 2, "boolCol == TRUE"],
      ["AssertLength", "BoolObject", 1, "boolCol == FALSE"],
      ["AssertLength", "BoolObject", 0, "boolCol >  true"],
      ["AssertLength", "BoolObject", 2, "boolCol >= true"],
      ["AssertLength", "BoolObject", 1, "boolCol <  true"],
      ["AssertLength", "BoolObject", 3, "boolCol <= true"],
      ["AssertLength", "BoolObject", 2, "boolCol == $0", true],
      ["AssertLength", "BoolObject", 1, "boolCol == $0", false],
      ["AssertLength", "BoolObject", 0, "boolCol == true && boolCol == false"],
      ["AssertLength", "BoolObject", 3, "boolCol == true || boolCol == false"],

      ["AssertException", "BoolObject", "Unsupported comparison between type", "boolCol == 0"],
      ["AssertException", "BoolObject", "Unsupported comparison between type", "boolCol == 1"],
      ["AssertException", "BoolObject", "Unsupported comparison between type", "boolCol == 'not a bool'"],
      ["AssertException", "BoolObject", "Unsupported comparison between type", "boolCol == $0", "not a bool"],
      ["AssertException", "BoolObject", "Unsupported comparison operator", "boolCol BEGINSWITH true"],
      ["AssertException", "BoolObject", "Unsupported comparison operator", "boolCol CONTAINS true"],
      ["AssertException", "BoolObject", "Unsupported comparison operator", "boolCol ENDSWITH true"],
    ],
  },

  intTests: {
    schema: [{ name: "IntObject", properties: [{ name: "intCol", type: "int" }] }],
    objects: [
      { type: "IntObject", value: [-1] },
      { type: "IntObject", value: [0] },
      { type: "IntObject", value: [100] },
    ],
    tests: [
      ["AssertLength", "IntObject", 1, "intCol == -1"],
      ["AssertLength", "IntObject", 1, "intCol==0"],
      ["AssertLength", "IntObject", 0, "1 == intCol"],
      ["AssertLength", "IntObject", 2, "intCol != 0"],
      ["AssertLength", "IntObject", 2, "intCol > -1"],
      ["AssertLength", "IntObject", 3, "intCol >= -1"],
      ["AssertLength", "IntObject", 2, "intCol < 100"],
      ["AssertLength", "IntObject", 3, "intCol <= 100"],
      ["AssertLength", "IntObject", 1, "intCol > 0x1F"],
      ["AssertLength", "IntObject", 1, "intCol == $0", 100],
      ["AssertLength", "IntObject", 2, "intCol >= 0 LIMIT(2)"],

      ["AssertException", "IntObject", "Unsupported comparison between type", "intCol == false"],
      ["AssertException", "IntObject", "Cannot convert", "intCol == 'not an int'"],
      ["AssertException", "IntObject", "Unsupported comparison between type", "intCol == $0", "not an int"],
      ["AssertException", "IntObject", "Unsupported comparison operator", "intCol BEGINSWITH 1"],
      ["AssertException", "IntObject", "Unsupported comparison operator", "intCol CONTAINS 1"],
      ["AssertException", "IntObject", "Unsupported comparison operator", "intCol ENDSWITH 1"],
    ],
  },

  floatTests: {
    schema: [{ name: "FloatObject", properties: [{ name: "floatCol", type: "float" }] }],
    objects: [
      { type: "FloatObject", value: [-1.001] },
      { type: "FloatObject", value: [0.0] },
      { type: "FloatObject", value: [100.2] },
    ],
    tests: [
      ["AssertLength", "FloatObject", 1, "floatCol == -1.001"],
      ["AssertLength", "FloatObject", 1, "floatCol = 0"],
      ["AssertLength", "FloatObject", 0, "floatCol == 1"],
      ["AssertLength", "FloatObject", 2, "floatCol != 0"],
      ["AssertLength", "FloatObject", 2, "floatCol > -1.001"],
      ["AssertLength", "FloatObject", 3, "floatCol >= -1.001"],
      ["AssertLength", "FloatObject", 2, "floatCol < 100.2"],
      ["AssertLength", "FloatObject", 3, "floatCol <= 100.2"],
      ["AssertLength", "FloatObject", 1, "floatCol > 0x1F"],
      ["AssertLength", "FloatObject", 1, "floatCol == $0", 100.2],
      ["AssertLength", "FloatObject", 2, "floatCol >= 0.0"],

      ["AssertException", "FloatObject", "Unsupported comparison between type", "floatCol == false"],
      ["AssertException", "FloatObject", "Cannot convert", "floatCol == 'not a float'"],
      ["AssertException", "FloatObject", "Unsupported comparison between type", "floatCol == $0", "not a float"],
      ["AssertException", "FloatObject", "Unsupported comparison operator", "floatCol BEGINSWITH 1"],
      ["AssertException", "FloatObject", "Unsupported comparison operator", "floatCol CONTAINS 1"],
      ["AssertException", "FloatObject", "Unsupported comparison operator", "floatCol ENDSWITH 1"],

      ["Disabled", "AssertException", "FloatObject", "floatCol = 3.5e+38"],
      ["Disabled", "AssertException", "FloatObject", "floatCol = -3.5e+38"],
    ],
  },

  doubleTests: {
    schema: [{ name: "DoubleObject", properties: [{ name: "doubleCol", type: "double" }] }],
    objects: [
      { type: "DoubleObject", value: [-1.001] },
      { type: "DoubleObject", value: [0.0] },
      { type: "DoubleObject", value: [100.2] },
    ],
    tests: [
      ["AssertLength", "DoubleObject", 1, "doubleCol == -1.001"],
      ["AssertLength", "DoubleObject", 1, "doubleCol == 0"],
      ["AssertLength", "DoubleObject", 0, "1 == doubleCol"],
      ["AssertLength", "DoubleObject", 2, "doubleCol != 0"],
      ["AssertLength", "DoubleObject", 2, "doubleCol > -1.001"],
      ["AssertLength", "DoubleObject", 3, "doubleCol >= -1.001"],
      ["AssertLength", "DoubleObject", 2, "doubleCol < 100.2"],
      ["AssertLength", "DoubleObject", 3, "doubleCol <= 100.2"],
      ["AssertLength", "DoubleObject", 1, "doubleCol > 0x1F"],
      ["AssertLength", "DoubleObject", 1, "doubleCol == $0", 100.2],
      ["AssertLength", "DoubleObject", 2, "doubleCol >= 0.0 LIMIT(2)"],

      ["AssertException", "DoubleObject", "Unsupported comparison between type", "doubleCol == false"],
      ["AssertException", "DoubleObject", "Cannot convert", "doubleCol == 'not a double'"],
      ["AssertException", "DoubleObject", "Unsupported comparison between type", "doubleCol == $0", "not a double"],
      ["AssertException", "DoubleObject", "Unsupported comparison operator", "doubleCol BEGINSWITH 1"],
      ["AssertException", "DoubleObject", "Unsupported comparison operator", "doubleCol CONTAINS 1"],
      ["AssertException", "DoubleObject", "Unsupported comparison operator", "doubleCol ENDSWITH 1"],
    ],
  },

  stringTests: {
    schema: [{ name: "StringObject", properties: [{ name: "stringCol", type: "string" }] }],
    objects: [
      { type: "StringObject", value: ["A"] },
      { type: "StringObject", value: ["a"] },
      { type: "StringObject", value: ["a"] },
      { type: "StringObject", value: ["C"] },
      { type: "StringObject", value: ["c"] },
      { type: "StringObject", value: ["abc"] },
      { type: "StringObject", value: ["ABC"] },
      { type: "StringObject", value: [""] },
      { type: "StringObject", value: ["\\\"\\n\\0\\r\\\\'"] },
    ],
    tests: [
      ["AssertLength", "StringObject", 2, "stringCol == 'a'"],
      ["AssertLength", "StringObject", 1, "'c' == stringCol"],
      ["AssertLength", "StringObject", 2, 'stringCol == "a"'],
      ["AssertLength", "StringObject", 1, "stringCol=='abc'"],
      ["AssertLength", "StringObject", 1, "stringCol == ''"],
      ["AssertLength", "StringObject", 8, "stringCol != ''"],
      ["AssertLength", "StringObject", 1, 'stringCol == "\\"\\n\\0\\r\\\\\'"'],
      ["AssertLength", "StringObject", 3, "stringCol BEGINSWITH 'a'"],
      ["AssertLength", "StringObject", 1, "stringCol beginswith 'ab'"],
      ["AssertLength", "StringObject", 0, "stringCol BEGINSWITH 'abcd'"],
      ["AssertLength", "StringObject", 2, "stringCol BEGINSWITH 'A'"],
      ["AssertLength", "StringObject", 2, "stringCol ENDSWITH 'c'"],
      ["AssertLength", "StringObject", 1, "stringCol endswith 'bc'"],
      ["AssertLength", "StringObject", 9, "stringCol ENDSWITH ''"],
      ["AssertLength", "StringObject", 1, "stringCol CONTAINS 'b'"],
      ["AssertLength", "StringObject", 2, "stringCol contains 'c'"],
      ["AssertLength", "StringObject", 9, "stringCol CONTAINS ''"],
      ["AssertLength", "StringObject", 2, "stringCol == $0", "a"],
      ["AssertLength", "StringObject", 2, "stringCol ENDSWITH $0", "c"],
      ["AssertLength", "StringObject", 2, "stringCol BEGINSWITH 'a' LIMIT(2)"],

      ["AssertException", "StringObject", "Unsupported comparison between type", "stringCol == true"],
      ["AssertException", "StringObject", "Unsupported comparison between type", "stringCol == 123"],
      ["AssertException", "StringObject", "Unsupported comparison operator", "stringCol CONTAINS $0", 1],

      ["AssertLength", "StringObject", 3, "stringCol ==[c] 'a'"],
      ["AssertLength", "StringObject", 5, "stringCol BEGINSWITH[c] 'A'"],
      ["AssertLength", "StringObject", 4, "stringCol ENDSWITH[c] 'c'"],
      ["AssertLength", "StringObject", 2, "stringCol CONTAINS[c] 'B'"],
    ],
  },

  binaryTests: {
    schema: [{ name: "BinaryObject", properties: [{ name: "binaryCol", type: "data" }] }],
    objects: [
      { type: "BinaryObject", value: [[1, 100, 233, 255, 0]] },
      { type: "BinaryObject", value: [[1, 100]] },
      { type: "BinaryObject", value: [[100]] },
      { type: "BinaryObject", value: [[2]] },
      { type: "BinaryObject", value: [[255, 0]] },
    ],
    tests: [
      ["AssertLength", "BinaryObject", 1, "binaryCol == $0", [1, "binaryCol"]],
      ["AssertLength", "BinaryObject", 1, "$0 == binaryCol", [2, "binaryCol"]],
      ["AssertLength", "BinaryObject", 4, "binaryCol != $0", [0, "binaryCol"]],
      ["AssertLength", "BinaryObject", 1, "binaryCol BEGINSWITH $0", [0, "binaryCol"]],
      ["AssertLength", "BinaryObject", 2, "binaryCol BEGINSWITH $0", [1, "binaryCol"]],
      ["AssertLength", "BinaryObject", 2, "binaryCol ENDSWITH $0", [4, "binaryCol"]],
      ["AssertLength", "BinaryObject", 3, "binaryCol CONTAINS $0", [2, "binaryCol"]],
    ],
  },

  objectTests: {
    schema: [
      { name: "IntObject", properties: [{ name: "intCol", type: "int" }] },
      { name: "LinkObject", properties: [{ name: "linkCol", type: "object", objectType: "IntObject" }] },
    ],
    objects: [
      { type: "LinkObject", value: [[1]] },
      { type: "LinkObject", value: [[2]] },
      { type: "LinkObject", value: [null] },
    ],
    tests: [
      ["AssertLength", "LinkObject", 1, "linkCol == $0", [1, "linkCol"]],
      ["AssertLength", "LinkObject", 1, "$0 == linkCol", [1, "linkCol"]],
      ["AssertLength", "LinkObject", 2, "linkCol != $0", [0, "linkCol"]],
      ["AssertLength", "LinkObject", 1, "linkCol = null"],
      ["AssertLength", "LinkObject", 2, "linkCol != NULL"],
      ["AssertLength", "LinkObject", 1, "linkCol = $0", null],

      ["AssertException", "LinkObject", "Unsupported operator", "linkCol > $0", [0, "linkCol"]],
      ["AssertException", "LinkObject", "'LinkObject' has no property 'intCol'", "intCol = $0", [0, "linkCol"]],
    ],
  },

  compoundTests: {
    schema: [{ name: "IntObject", properties: [{ name: "intCol", type: "int" }], primaryKey: "intCol" }],
    objects: [
      { type: "IntObject", value: [0] },
      { type: "IntObject", value: [1] },
      { type: "IntObject", value: [2] },
      { type: "IntObject", value: [3] },
    ],
    tests: [
      ["AssertResultValues", "IntObject", [], "intCol == 0 && intCol == 1"],
      ["AssertResultValues", "IntObject", [0, 1], "intCol == 0 || intCol == 1"],
      ["AssertResultValues", "IntObject", [0], "intCol == 0 && intCol != 1"],
      ["AssertResultValues", "IntObject", [2, 3], "intCol >= 2 && intCol < 4"],
      ["AssertResultValues", "IntObject", [0], "intCol == 0 && NOT intCol != 0"],
      ["AssertResultValues", "IntObject", [0, 3], "intCol == 0 || NOT (intCol == 1 || intCol == 2)"],
      ["AssertResultValues", "IntObject", [1], "(intCol == 0 || intCol == 1) && intCol >= 1"],
      ["AssertResultValues", "IntObject", [1], "intCol >= 1 && (intCol == 0 || intCol == 1)"],
      ["AssertResultValues", "IntObject", [0, 1], "intCol == 0 || (intCol == 1 && intCol >= 1)"],
      ["AssertResultValues", "IntObject", [0, 1], "(intCol == 1 && intCol >= 1) || intCol == 0"],
      ["AssertResultValues", "IntObject", [0, 1], "intCol == 0 || intCol == 1 && intCol >= 1"],
      ["AssertResultValues", "IntObject", [0, 1, 2], "intCol == 0 || intCol == 1 || intCol <= 2"],
      ["AssertResultValues", "IntObject", [0, 1], "intCol == 1 && intCol >= 1 || intCol == 0"],
      ["AssertResultValues", "IntObject", [0, 1], "intCol == 1 || intCol == 0 && intCol <= 0 && intCol >= 0"],
      ["AssertResultValues", "IntObject", [0, 1], "intCol == 0 || NOT (intCol == 3 && intCol >= 0) && intCol == 1"],
    ],
  },

  keyPathTests: {
    schema: [
      {
        name: "BasicTypesObject",
        properties: [
          { name: "intCol", type: "int" },
          { name: "floatCol", type: "float" },
          { name: "doubleCol", type: "double" },
          { name: "stringCol", type: "string" },
          { name: "dateCol", type: "date?" },
        ],
      },
      {
        name: "LinkTypesObject",
        primaryKey: "primaryKey",
        properties: [
          { name: "primaryKey", type: "int" },
          { name: "basicLink", type: "object", objectType: "BasicTypesObject" },
          { name: "linkLink", type: "object", objectType: "LinkTypesObject" },
          { name: "linkList", type: "BasicTypesObject[]" },
        ],
      },
    ],
    objects: [
      { type: "LinkTypesObject", value: [0, [1, 0.1, 0.001, "1", null], null, []] },
      { type: "LinkTypesObject", value: [1, null, [2, [1, 0.1, 0.001, "1", null], null, []], []] },
      { type: "LinkTypesObject", value: [3, null, [4, [2, 0.2, 0.002, "2", null], null, []], []] },
      { type: "LinkTypesObject", value: [5, null, null, [[3, 0.3, 0.003, "3", null]]] },
    ],
    tests: [
      ["AssertResultValues", "LinkTypesObject", [0, 2], "basicLink.intCol == 1"],
      ["AssertResultValues", "LinkTypesObject", [1], "linkLink.basicLink.intCol == 1"],
      ["AssertResultValues", "LinkTypesObject", [1, 3], "linkLink.basicLink.intCol > 0"],
      ["AssertResultValues", "LinkTypesObject", [0, 2], "basicLink.floatCol == 0.1"],
      ["AssertResultValues", "LinkTypesObject", [1], "linkLink.basicLink.floatCol == 0.1"],
      ["AssertResultValues", "LinkTypesObject", [1, 3], "linkLink.basicLink.floatCol > 0"],
      ["AssertResultValues", "LinkTypesObject", [5], "linkList.intCol == 3"],
    ],
  },

  optionalTests: {
    schema: [
      {
        name: "OptionalTypesObject",
        primaryKey: "primaryKey",
        properties: [
          { name: "primaryKey", type: "int" },
          { name: "intCol", type: "int", optional: true },
          { name: "floatCol", type: "float", optional: true },
          { name: "doubleCol", type: "double", optional: true },
          { name: "stringCol", type: "string", optional: true },
          { name: "dateCol", type: "date", optional: true },
          { name: "dataCol", type: "data", optional: true },
        ],
      },
      {
        name: "LinkTypesObject",
        primaryKey: "primaryKey",
        properties: [
          { name: "primaryKey", type: "int" },
          { name: "basicLink", type: "object", objectType: "OptionalTypesObject" },
        ],
      },
    ],
    objects: [
      { type: "LinkTypesObject", value: [0, [0, 1, 0.1, 0.001, "1", 1, [1, 10, 100]]] },
      { type: "LinkTypesObject", value: [1, [1, null, null, null, null, null, null]] },
    ],
    tests: [
      ["AssertResultValues", "OptionalTypesObject", [1], "intCol == null"],
      ["AssertResultValues", "OptionalTypesObject", [1], "null == intCol"],
      ["AssertResultValues", "OptionalTypesObject", [0], "intCol != null"],
      ["AssertResultValues", "OptionalTypesObject", [1], "floatCol == null"],
      ["AssertResultValues", "OptionalTypesObject", [0], "floatCol != null"],
      ["AssertResultValues", "OptionalTypesObject", [1], "doubleCol == null"],
      ["AssertResultValues", "OptionalTypesObject", [0], "doubleCol != null"],
      ["AssertResultValues", "OptionalTypesObject", [1], "stringCol == null"],
      ["AssertResultValues", "OptionalTypesObject", [0], "stringCol != null"],
      ["AssertResultValues", "OptionalTypesObject", [1], "dateCol == null"],
      ["AssertResultValues", "OptionalTypesObject", [0], "dateCol != null"],
      ["AssertResultValues", "OptionalTypesObject", [1], "dataCol == null"],
      ["AssertResultValues", "OptionalTypesObject", [0], "dataCol != null"],

      ["AssertResultValues", "LinkTypesObject", [1], "basicLink.intCol == null"],
      ["AssertResultValues", "LinkTypesObject", [0], "basicLink.intCol != null"],
      ["AssertResultValues", "LinkTypesObject", [1], "basicLink.floatCol == null"],
      ["AssertResultValues", "LinkTypesObject", [0], "basicLink.floatCol != null"],
      ["AssertResultValues", "LinkTypesObject", [1], "basicLink.doubleCol == null"],
      ["AssertResultValues", "LinkTypesObject", [0], "basicLink.doubleCol != null"],
      ["AssertResultValues", "LinkTypesObject", [1], "basicLink.stringCol == null"],
      ["AssertResultValues", "LinkTypesObject", [0], "basicLink.stringCol != null"],
      ["AssertResultValues", "LinkTypesObject", [1], "basicLink.dateCol == null"],
      ["AssertResultValues", "LinkTypesObject", [0], "basicLink.dateCol != null"],
    ],
  },

  orderingTests: {
    schema: [
      {
        name: "Person",
        properties: [
          { name: "id", type: "int" },
          { name: "name", type: "string" },
          { name: "age", type: "int" },
        ],
        primaryKey: "id",
      },
    ],
    objects: [
      { type: "Person", value: [0, "John", 28] },
      { type: "Person", value: [1, "John", 37] },
      { type: "Person", value: [2, "Jake", 27] },
      { type: "Person", value: [3, "Jake", 32] },
      { type: "Person", value: [4, "Jake", 32] },
      { type: "Person", value: [5, "Johnny", 19] },
    ],
    tests: [
      ["AssertResultValues", "Person", [1, 3], "age > 20 SORT(age DESC) DISTINCT(name)"],
      ["AssertResultValues", "Person", [2, 0], "age > 20 SORT(age ASC) DISTINCT(name)"],
      ["AssertResultValues", "Person", [2, 0], "age > 20 SORT(age ASC, name DESC) DISTINCT(name)"],
      ["AssertResultValues", "Person", [2, 0], "age > 20 SORT(name DESC) SORT(age ASC) DISTINCT(name)"],
      ["AssertResultValues", "Person", [2, 0, 3, 1], "age > 20 SORT(age ASC, name DESC) DISTINCT(name, age)"],
      ["AssertResultValues", "Person", [0, 2], "age > 20 SORT(age ASC) DISTINCT(age) SORT(name DESC) DISTINCT(name)"],
    ],
  },

  primitiveListTests: {
    schema: [
      {
        name: "Movie",
        properties: [
          { name: "id", type: "int" },
          { name: "name", type: "string" },
          { name: "tags", type: "string[]" },
          { name: "ratings", type: "int[]" },
        ],
        primaryKey: "id",
      },
    ],
    objects: [
      { type: "Movie", value: [0, "Matrix", ["science fiction", "artificial reality"], [5, 5, 3, 4, 5, 1, 5]] },
      { type: "Movie", value: [1, "Inception", ["dream", "science fiction", "thriller"], [3, 5, 3, 4, 5, 5]] },
      { type: "Movie", value: [2, "I, Robot", ["science fiction", "dystopia", "robot"], [2, 4, 3, 3, 4, 5, 1]] },
    ],
    tests: [
      ["AssertResultValues", "Movie", [0, 1, 2], "tags =[c] 'science fiction'"],
      ["AssertResultValues", "Movie", [0, 1, 2], "tags BEGINSWITH[c] 'science'"],
      ["AssertResultValues", "Movie", [], "NONE tags CONTAINS ' '"],
      ["AssertResultValues", "Movie", [0, 1], "ratings.@avg >= 4"],
      ["AssertResultValues", "Movie", [1], "ALL ratings > 1"],
      ["AssertResultValues", "Movie", [], "ANY tags CONTAINS[c] name"],
      ["AssertResultValues", "Movie", [1, 2], "tags.@size > 2"],
      ["AssertResultValues", "Movie", [0], "tags.length > 16"],
      ["AssertResultValues", "Movie", [0], "ALL tags.length > 5"],
      ["AssertResultValues", "Movie", [0, 1], "ratings.@min > id"],
      ["AssertResultValues", "Movie", [0, 1, 2], "ratings.@count > 0"],
    ],
  },

  objectIdTests: {
    schema: [{ name: "ObjectIdObject", properties: [{ name: "id", type: "objectId" }] }],
    objects: [
      { type: "ObjectIdObject", value: ["6001c033600510df3bbfd864"] },
      { type: "ObjectIdObject", value: ["6001c04b3bc6feeda9ef44f3"] },
      { type: "ObjectIdObject", value: ["6001c05521acef4e39acfd6f"] },
      { type: "ObjectIdObject", value: ["6001c05e73ac00af232fb7f6"] },
      { type: "ObjectIdObject", value: ["6001c069c2f8b350ddeeceaa"] },
    ],
    tests: [
      ["AssertLength", "ObjectIdObject", 1, "id == $0", [3, "id"]],
      ["AssertLength", "ObjectIdObject", 1, "$0 == id", [3, "id"]],
      ["AssertLength", "ObjectIdObject", 4, "id != $0", [2, "id"]],

      ["AssertLength", "ObjectIdObject", 1, "id == oid(6001c033600510df3bbfd864)"],
      ["AssertLength", "ObjectIdObject", 1, "oid(6001c04b3bc6feeda9ef44f3) == id"],
      ["AssertLength", "ObjectIdObject", 4, "id != oid(6001c033600510df3bbfd864)"],
    ],
  },

  objectIdOptionalTests: {
    schema: [{ name: "ObjectIdObject", properties: [{ name: "id", type: "objectId?" }] }],
    objects: [
      { type: "ObjectIdObject", value: [null] },
      { type: "ObjectIdObject", value: ["6001c04b3bc6feeda9ef44f3"] },
      { type: "ObjectIdObject", value: [null] },
      { type: "ObjectIdObject", value: ["6001c05e73ac00af232fb7f6"] },
      { type: "ObjectIdObject", value: ["6001c069c2f8b350ddeeceaa"] },
    ],
    tests: [
      ["AssertLength", "ObjectIdObject", 2, "id == $0", null],
      ["AssertLength", "ObjectIdObject", 2, "$0 == id", null],
      ["AssertLength", "ObjectIdObject", 3, "id != $0", null],

      ["AssertLength", "ObjectIdObject", 2, "id == null"],
      ["AssertLength", "ObjectIdObject", 2, "null == id"],
      ["AssertLength", "ObjectIdObject", 3, "id != null"],
    ],
  },

  uuidTests: {
    schema: [{ name: "UUIDObject", properties: [{ name: "id", type: "uuid" }] }],
    objects: [
      { type: "UUIDObject", value: ["d1b186e1-e9e0-4768-a1a7-c492519d47ee"] },
      { type: "UUIDObject", value: ["08c35c66-69bd-4b28-8177-f9135553711f"] },
      { type: "UUIDObject", value: ["35f8f06b-dc77-4781-8b5e-9a09759db989"] },
      { type: "UUIDObject", value: ["39e2d5ce-087d-4d0c-a149-05acc74c53f1"] },
      { type: "UUIDObject", value: ["b521bc19-4e92-4e23-ae85-df937abfd89c"] },
    ],
    tests: [
      ["AssertLength", "UUIDObject", 1, "id == $0", [3, "id"]],
      ["AssertLength", "UUIDObject", 1, "$0 == id", [3, "id"]],
      ["AssertLength", "UUIDObject", 4, "id != $0", [2, "id"]],

      ["AssertLength", "UUIDObject", 1, "id == uuid(d1b186e1-e9e0-4768-a1a7-c492519d47ee)"],
      ["AssertLength", "UUIDObject", 1, "uuid(08c35c66-69bd-4b28-8177-f9135553711f) == id"],
      ["AssertLength", "UUIDObject", 4, "id != uuid(d1b186e1-e9e0-4768-a1a7-c492519d47ee)"],
    ],
  },

  uuidOptionalTests: {
    schema: [{ name: "UUIDObject", properties: [{ name: "id", type: "uuid?" }] }],
    objects: [
      { type: "UUIDObject", value: [null] },
      { type: "UUIDObject", value: ["08c35c66-69bd-4b28-8177-f9135553711f"] },
      { type: "UUIDObject", value: [null] },
      { type: "UUIDObject", value: ["39e2d5ce-087d-4d0c-a149-05acc74c53f1"] },
      { type: "UUIDObject", value: ["b521bc19-4e92-4e23-ae85-df937abfd89c"] },
    ],
    tests: [
      ["AssertLength", "UUIDObject", 2, "id == $0", null],
      ["AssertLength", "UUIDObject", 2, "$0 == id", null],
      ["AssertLength", "UUIDObject", 3, "id != $0", null],

      ["AssertLength", "UUIDObject", 2, "id == null"],
      ["AssertLength", "UUIDObject", 2, "null == id"],
      ["AssertLength", "UUIDObject", 3, "id != null"],
    ],
  },
};

const StringObjectSchema = {
  name: "StringObject",
  properties: {
    stringCol: "string",
  },
};

const FloatObjectSchema = {
  name: "FloatObject",
  properties: {
    floatCol: "float?",
  },
};

const IntObjectSchema = {
  name: "IntObject",
  properties: {
    intCol: "int",
  },
};

interface IntObject {
  intCol: number;
}

const Decimal128ObjectSchema = {
  name: "Decimal128Object",
  properties: {
    decimal128Col: "decimal128",
  },
};

const DoubleOptionalObjectSchema = {
  name: "DoubleObject",
  properties: {
    doubleCol: "double?",
  },
};
type ConverterFunction = (value: any, schema: SchemaWithPropertyArray[], type: string) => any;
const typeConverters: Record<string, ConverterFunction> = {};

const convertValue: ConverterFunction = (value, schema, type) => {
  const objSchema = schema.find(function (el) {
    return el.name == type;
  });
  if (!objSchema) {
    throw "Object schema '" + type + "' not found in test suite.";
  }

  return value.map((propertyValue: any, index: number) => {
    if (propertyValue == null) {
      return null;
    }
    const property = objSchema.properties[index] as Realm.ObjectSchemaProperty;
    const converter = typeConverters[property.type];
    const propType = property.objectType ? property.objectType : property.type;
    return converter ? converter(propertyValue, schema, propType) : propertyValue;
  });
};

typeConverters["date"] = (value) => new Date(value);
typeConverters["date?"] = (value) => new Date(value);
typeConverters["data"] = (value) => new Uint8Array(value);
typeConverters["object"] = convertValue;
typeConverters["objectId"] = (value) => new ObjectId(value);
typeConverters["objectId?"] = typeConverters["objectId"];
typeConverters["uuid"] = (value) => new UUID(value);
typeConverters["uuid?"] = typeConverters["uuid"];

function runQuerySuite(suite: TestCase) {
  //@ts-expect-error This uses non-public schema definition.
  const realm = new Realm({ schema: suite.schema });
  const objects = suite.objects.map(function (obj) {
    return { type: obj.type, value: convertValue(obj.value, suite.schema, obj.type) };
  });

  realm.write(function () {
    for (let i = 0; i < objects.length; i++) {
      objects[i] = realm.create(objects[i].type, objects[i].value);
    }
  });

  for (const index in suite.tests) {
    const [testType, objectType] = suite.tests[index];

    switch (testType) {
      case "AssertLength": {
        const [, , expectedLength, queryString, ...queryArgs] = suite.tests[index];

        // Array arguments reference a specific field of an object at a specifc index
        // in the objects array. Not a good way to do this, just supporting legacy behavior
        if (Array.isArray(queryArgs[0])) {
          const [indexOfReferencedObject, referencedProperty] = queryArgs[0];
          //@ts-expect-error Expected to be a valid index.
          queryArgs[0] = objects[indexOfReferencedObject][referencedProperty];
        }
        const filteredLength = realm.objects<any>(objectType).filtered(queryString, ...queryArgs).length;
        expect(filteredLength).equal(
          expectedLength,
          `Expected ${expectedLength} results for query '${queryString}' with [${queryArgs}] but got ${filteredLength}`,
        );
        break;
      }
      case "AssertResultValues": {
        // Run a query then compare whether the results are as expected by comparing
        // their primary keys with a given array of expected primary keys.
        const [, , expectedResults, queryString, ...queryArgs] = suite.tests[index];
        let results = realm.objects<any>(objectType);
        results = results.filtered(queryString, ...queryArgs);

        expect(expectedResults.length).equals(results.length);

        const objSchema = suite.schema.find((el) => el.name == objectType);
        if (!objSchema) {
          throw "Object schema '" + objectType + "' not found in test suite.";
        }
        const primary = objSchema.primaryKey;
        if (!primary) {
          throw "Primary key required for object comparison";
        }

        expect(expectedResults).to.deep.equal(results.map((el) => el[primary]));
        break;
      }
      case "AssertException": {
        const [, , expectedException, queryString, ...queryArgs] = suite.tests[index];
        const results = realm.objects(objectType);

        expect(() => {
          results.filtered(queryString, ...queryArgs);
        }).throws(expectedException, "Expected exception not thrown for query: " + JSON.stringify(queryArgs));
        break;
      }
      case "Disabled":
        break;
      default: {
        throw "Invalid query test '" + testType + "'";
      }
    }
  }
}

describe("Migrated Query Tests", () => {
  beforeEach(Realm.clearTestState);

  describe("Shared Type Tests", () => {
    Object.entries(SharedTestSuiteCases).forEach(([testName, cases]) => {
      it(testName, () => {
        runQuerySuite(cases);
      });
    });
  });

  it("should work with malformed queries", () => {
    const realm = new Realm({ schema: [StringObjectSchema] });
    expect(() => {
      realm.objects(StringObjectSchema.name).filtered("stringCol = $0");
    }).throws("Request for argument at index 0 but no arguments are provided");
  });

  it("queries with floats, or", () => {
    const realm = new Realm({ schema: [FloatObjectSchema] });
    realm.write(function () {
      realm.create(FloatObjectSchema.name, { floatCol: 1.0 });
      realm.create(FloatObjectSchema.name, { floatCol: 2.0 });
    });

    const objects_1 = realm.objects(FloatObjectSchema.name).filtered("floatCol = 1.0 || floatCol = 2.0");
    expect(objects_1.length).equals(2);

    const objects_2 = realm.objects(FloatObjectSchema.name).filtered("floatCol = 1.0 || floatCol = 3.0");
    expect(objects_2.length).equals(1);

    const objects_3 = realm.objects(FloatObjectSchema.name).filtered("floatCol = 0.0 || floatCol = 3.0");
    expect(objects_3.length).equals(0);

    realm.close();
  });

  it("queries with doubles, or", () => {
    const realm = new Realm({ schema: [DoubleOptionalObjectSchema] });
    realm.write(function () {
      realm.create(DoubleOptionalObjectSchema.name, { doubleCol: 1.0 });
      realm.create(DoubleOptionalObjectSchema.name, { doubleCol: 2.0 });
      realm.create(DoubleOptionalObjectSchema.name, {});
    });

    const objects_1 = realm.objects(DoubleOptionalObjectSchema.name).filtered("doubleCol = 1.0 || doubleCol = 2.0");
    expect(objects_1.length).equals(2);

    const objects_2 = realm.objects(DoubleOptionalObjectSchema.name).filtered("doubleCol = 1.0 || doubleCol = 3.0");
    expect(objects_2.length).equals(1);

    const objects_3 = realm.objects(DoubleOptionalObjectSchema.name).filtered("doubleCol = 0.0 || doubleCol = 3.0");
    expect(objects_3.length).equals(0);

    const objects_4 = realm.objects(DoubleOptionalObjectSchema.name).filtered("doubleCol = null || doubleCol = 3.0");
    expect(objects_4.length).equals(1);

    realm.close();
  });

  it("queries with filter", () => {
    const realm = new Realm({ schema: [StringObjectSchema, IntObjectSchema] });
    realm.write(function () {
      [1, 2, 3, 5, 8, 13].forEach((v) => {
        realm.create(IntObjectSchema.name, { intCol: v });
        realm.create(StringObjectSchema.name, { stringCol: `${v}` });
      });
    });

    const getTestQueryLength = (schema: Realm.ObjectSchema, column: string, values: number[] | string[]) => {
      return realm.objects(schema.name).filtered(values.map((v) => `${column} == ${v}`).join(" OR ")).length;
    };
    const asStringArray = (values: number[]) => values.map((v) => `"${v}"`);

    expect(getTestQueryLength(IntObjectSchema, "intCol", [2, 3, 8])).equals(3);
    expect(getTestQueryLength(StringObjectSchema, "stringCol", asStringArray([2, 3, 8]))).equals(3);

    expect(getTestQueryLength(IntObjectSchema, "intCol", [3, 7, 8])).equals(2);
    expect(getTestQueryLength(StringObjectSchema, "stringCol", asStringArray([3, 7, 8]))).equals(2);

    expect(getTestQueryLength(IntObjectSchema, "intCol", [0, 14])).equals(0);
    expect(getTestQueryLength(StringObjectSchema, "stringCol", asStringArray([0, 14]))).equals(0);
  });
  it("should query decimal128", () => {
    const realm = new Realm({ schema: [Decimal128ObjectSchema] });
    realm.write(function () {
      [0, 1, 2].forEach((v) => {
        realm.create(Decimal128ObjectSchema.name, { decimal128Col: Decimal128.fromString(`1000${v}`) });
      });
    });
    const decimal128Objects = realm.objects(Decimal128ObjectSchema.name);

    expect(decimal128Objects.filtered("decimal128Col <  10002").length).equals(2);
    expect(decimal128Objects.filtered("decimal128Col <= 10002").length).equals(3);
    expect(decimal128Objects.filtered("decimal128Col >  10001").length).equals(1);
    expect(decimal128Objects.filtered("decimal128Col >= 10001").length).equals(2);
    expect(decimal128Objects.filtered("decimal128Col == 10002").length).equals(1);
    expect(decimal128Objects.filtered("decimal128Col != 10002").length).equals(2);

    realm.close();
  });

  it("should support queries with UUID as primary key", () => {
    const testStringUuids = [
      "01b1a58a-bb92-47a2-a3aa-d9c735e6fd42",
      "ab01fec2-55d5-4fac-9e04-980bff6a521d",
      "6683f348-d441-4846-81aa-cc375b771032",
    ];
    const nonExistingStringUuid = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";

    const primUuidSchema = {
      name: "PrimUuidObject",
      primaryKey: "_id",
      properties: {
        _id: "uuid",
        text: "string",
      },
    };

    const realm = new Realm({ schema: [primUuidSchema] });
    realm.write(() => {
      testStringUuids.forEach((uuidStr) => {
        realm.create(primUuidSchema.name, { _id: new UUID(uuidStr), text: uuidStr });
      });
    });

    // objectForPrimaryKey tests
    const nonExisting = realm.objectForPrimaryKey(primUuidSchema.name, new UUID(nonExistingStringUuid));
    expect(nonExisting).equals(
      null,
      `objectForPrimaryKey should return undefined for new UUID("${nonExistingStringUuid}")`,
    );

    testStringUuids.forEach((uuidStr) => {
      const obj = realm.objectForPrimaryKey(primUuidSchema.name, new UUID(uuidStr));
      expect(obj).not.equal(null, `objectForPrimaryKey should return a Realm.Object for new UUID("${uuidStr}")`);
      //@ts-expect-error _id is part of schema.
      expect(obj._id.toString()).equals(uuidStr);
    });

    // results.filtered tests
    const emptyFiltered = realm.objects(primUuidSchema.name).filtered("_id == $0", new UUID(nonExistingStringUuid));
    expect(emptyFiltered.length).equals(
      0,
      `filtered objects should contain 0 elements when filtered by new UUID("${nonExistingStringUuid}")`,
    );

    testStringUuids.forEach((uuidStr) => {
      const filtered = realm.objects(primUuidSchema.name).filtered("_id == $0", new UUID(uuidStr));
      expect(filtered.length).equals(1, `filtered objects should contain exactly 1 of new UUID("${uuidStr}")`);
    });
  });

  it("should work with between", () => {
    const realm = new Realm({ schema: [IntObjectSchema] });
    realm.write(() => {
      for (let i = 0; i < 10; i++) {
        realm.create(IntObjectSchema.name, { intCol: i });
      }
    });

    const range = realm.objects<IntObject>(IntObjectSchema.name).filtered("intCol BETWEEN {5, 8}"); // 5, 6, 7, 8
    expect(range.length).equals(4);
    expect(range[0].intCol).equals(5);
    expect(range[1].intCol).equals(6);
    expect(range[2].intCol).equals(7);
    expect(range[3].intCol).equals(8);

    realm.close();
  });
});

import { IPerson, PersonSchema } from "../schemas/person-and-dogs";
import { IContact, ContactSchema } from "../schemas/contact";

interface IPrimitive {
  s: string;
  b: boolean;
  i: number;
  f: number;
  d: number;
  t: Date;
}

const PrimitiveSchema: Realm.ObjectSchema = {
  name: "Primitive",
  properties: {
    s: "string",
    b: "bool",
    i: "int",
    f: "float",
    d: "double",
    t: "date",
  },
};

describe("Realm Query Language", () => {
  let realm: Realm;
  let persons: Realm.Results<IPerson>;
  let contacts: Realm.Results<IContact>;
  let primitives: Realm.Results<IPrimitive>;

  beforeEach(() => {
    Realm.clearTestState();
    realm = new Realm({ schema: [PersonSchema, ContactSchema, PrimitiveSchema] });
    realm.write(() => {
      const alice = realm.create<IPerson>(PersonSchema.name, { name: "Alice", age: 15 });
      const bob = realm.create<IPerson>(PersonSchema.name, { name: "Bob", age: 14, friends: [alice] });
      realm.create<IPerson>(PersonSchema.name, { name: "Charlie", age: 17, friends: [bob, alice] });

      realm.create<IContact>(ContactSchema.name, { name: "Alice", phones: ["555-1234-567"] });
      realm.create<IContact>(ContactSchema.name, { name: "Bob", phones: ["555-1122-333", "555-1234-567"] });
      realm.create<IContact>(ContactSchema.name, { name: "Charlie" });

      realm.create<IPrimitive>(PrimitiveSchema.name, {
        s: "foo",
        b: true,
        i: 2,
        f: 3.14,
        d: 2.72,
        t: new Date("2001-05-11T12:45:05"),
      });
      realm.create<IPrimitive>(PrimitiveSchema.name, {
        s: "Here is a Unicorn 🦄 today",
        b: false,
        i: 44,
        f: 1.41,
        d: 4.67,
        t: new Date("2004-02-26T10:15:02"),
      });
    });
    persons = realm.objects<IPerson>(PersonSchema.name);
    contacts = realm.objects<IContact>(ContactSchema.name);
    primitives = realm.objects<IPrimitive>(PrimitiveSchema.name);
  });

  afterEach(() => {
    realm.close();
  });

  describe("All objects", () => {
    it("properties and primitive types", () => {
      expect(persons.length).equal(3);
      expect(persons[0].name).equal("Alice");
      expect(persons[0].age).equal(15);
    });

    it("array of primitive types", () => {
      expect(contacts.length).equal(3);
      expect(contacts[0].phones.length).equal(1);
      expect(contacts[1].phones.length).equal(2);
      expect(contacts[2].phones.length).equal(0);
    });

    // https://github.com/realm/realm-js/issues/4844
    it("emoiji and contains", () => {
      const text = "unicorn 🦄 today";
      expect(primitives.length).equal(2);
      const unicorn1 = primitives.filtered("s CONTAINS 'unicorn 🦄 today'");
      const unicorn2 = primitives.filtered("s CONTAINS[c] 'unicorn 🦄 today'");
      const unicorn3 = primitives.filtered("s CONTAINS $0", text);
      const unicorn4 = primitives.filtered("s CONTAINS[c] $0", text);
      expect(unicorn1.length).equal(0);
      expect(unicorn2.length).equal(1);
      expect(unicorn3.length).equal(0);
      expect(unicorn4.length).equal(1);
    });
  });

  describe("IN operator", () => {
    it("properties and array of values", () => {
      const aged14Or15 = persons.filtered("age IN {14, 15}");
      expect(aged14Or15.length).equal(2);

      const aged17 = persons.filtered("age IN $0", [17]);
      expect(aged17.length).equal(1);

      const dennis = persons.filtered("name in {'Dennis'}");
      expect(dennis.length).equal(0);
    });

    it("array of primitive types", () => {
      const hasTwoPhones = contacts.filtered("phones.@count = 2");
      expect(hasTwoPhones.length).equal(1);
      expect(hasTwoPhones[0].name).equal("Bob");

      expect(contacts.filtered("'555-1234-567' IN phones").length).equal(2);
      expect(contacts.filtered("'123-4567-890' IN phones").length).equal(0);
      expect(contacts.filtered("ANY {'555-1234-567', '123-4567-890'} IN phones").length).equal(2);
      expect(contacts.filtered("ALL {'555-1234-567', '123-4567-890'} IN phones").length).equal(0);
      expect(contacts.filtered("NONE {'555-1234-567', '123-4567-890'} IN phones").length).equal(1);
      expect(contacts.filtered("NONE {'555-1122-333', '555-1234-567'} IN phones").length).equal(1);
      expect(contacts.filtered("ALL {'555-1122-333', '555-1234-567'} IN phones").length).equal(1);
    });
  });
});
