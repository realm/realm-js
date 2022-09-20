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
const bson = Realm.BSON;
const { assertEqual, assertNotEqual } = require("./asserts");

function bson_parse(json) {
  return bson.EJSON.parse(json, { relaxed: false });
}

function realm_parse(json) {
  return Realm["_bsonParseJsonForTest"](json);
}

function assert_fancy_eq(a, b) {
  a = bson.EJSON.stringify(a, { relaxed: false });
  b = bson.EJSON.stringify(b, { relaxed: false });
  // console.log(a);
  // console.log(b);
  assertEqual(a, b);
}

function check([t, val, serialized_if_special]) {
  const json = JSON.stringify({ val });
  const parsed = realm_parse(json);

  if (typeof t == "string") {
    assertEqual(typeof parsed.val, t);
  } else {
    assertEqual(parsed.val.constructor, t);
  }

  if (serialized_if_special) {
    assert_fancy_eq(parsed, { val: serialized_if_special });
  } else {
    assert_fancy_eq(parsed, bson_parse(json));
  }
}

function assertBig(numStr) {
  // assert that it isn't able to round trip as a double.
  assertNotEqual(Number(numStr).toString(), numStr);
  return numStr;
}

const values = {
  null: ["object", null],
  minkey: [bson.MinKey, { $minKey: 1 }],
  maxkey: [bson.MaxKey, { $maxKey: 1 }],

  string: ["string", "hello"],
  boolT: ["boolean", true],
  bool_f: ["boolean", false],

  // Note: the parser doesn't officially support support the relaxed EJSON,
  // so these two should not actually be used in practice.
  simple_double: ["number", 1.1],
  simple_intish_double: ["number", 1],

  decimal: [bson.Decimal128, { $numberDecimal: "1.100" }],
  double: ["number", { $numberDouble: "1.1" }],
  int: ["number", { $numberInt: "1" }],
  long_medium: ["number", { $numberLong: "12345678901" }],
  long_medium_neg: ["number", { $numberLong: "-12345678901" }],
  long_big: [bson.Long, { $numberLong: assertBig("1234567890123456789") }],
  long_big_neg: [bson.Long, { $numberLong: assertBig("-1234567890123456789") }],

  // These are special because we parse small NumberLongs into js numbers, so they
  // when they round trip, they become NumberInts. There isn't a great solution do this
  // especially since stitch returns 1.0 as a NumberLong.
  long_small: ["number", { $numberLong: "123" }, { $numberInt: "123" }],
  long_small_neg: ["number", { $numberLong: "-123" }, { $numberInt: "-123" }],

  timestamp: [bson.Timestamp, { $timestamp: { t: 1234, i: 5678 } }],
  date: [Date, { $date: { $numberLong: "1445401740123" } }],
  date_overflow_32_bit_time_t: [Date, { $date: { $numberLong: "7756748940123" } }],

  binary: [bson.Binary, { $binary: { base64: "c2hpYmJvbGV0aA==", subType: "0" } }],

  oid: [bson.ObjectId, { $oid: "123456789012345678901234" }],
  regex: [bson.BSONRegExp, { $regularExpression: { pattern: "match this", options: "ims" } }],

  object: [Object, { a: 1.1, b: 2.2, c: "sea" }],
  object_nested: [Object, { nested: { object: 1.1 } }],
  array: [Array, ["a", "b", "c"]],
  array_nested: [Array, ["a", [{ b: ["c", []] }]]],
};
for (let name in values) {
  exports[`test_val_${name}`] = () => check(values[name]);
}
