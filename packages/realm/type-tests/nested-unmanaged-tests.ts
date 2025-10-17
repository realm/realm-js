////////////////////////////////////////////////////////////////////////////
//
// Copyright 2024 Realm Inc.
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

/* eslint-disable @typescript-eslint/no-unused-vars -- We're just testing types */

// This file checks that the Unmanaged type re-mappings work correctly for Realm types, especially when there are nested classes

import * as BSON from "bson";
import Realm from "realm";

// Simple Unmanaged remapping tests
type MyObj = {
  stringProp1: Realm.Types.String;
  stringProp2: Realm.Types.String;
  nullableStringProp1: Realm.Types.String | null;
  nullableStringProp2: Realm.Types.String | null;
  stringOrUndefined1?: Realm.Types.String;
  stringOrUndefined2?: Realm.Types.String;

  listStringProp1: Realm.Types.List<Realm.Types.String>;
  listStringProp2: Realm.Types.List<Realm.Types.String>;
  listStringProp3: Realm.Types.List<Realm.Types.String>;
  nullableListStringProp1: Realm.Types.List<Realm.Types.String> | null;
  nullableListStringProp2: Realm.Types.List<Realm.Types.String> | null;
  nullableListStringProp3: Realm.Types.List<Realm.Types.String> | null;
  listStringOrUndefinedProp1?: Realm.Types.List<Realm.Types.String>;
  listStringOrUndefinedProp2?: Realm.Types.List<Realm.Types.String>;
  listStringOrUndefinedProp3?: Realm.Types.List<Realm.Types.String>;
};
const test: Realm.Unmanaged<MyObj> = {
  stringProp1: "test",
  // @ts-expect-error - Expected: invalid
  stringProp2: null,
  nullableStringProp1: null,
  nullableStringProp2: "blah",
  stringOrUndefined1: undefined,
  stringOrUndefined2: "sad",

  someExtraPropertyNotSpecifiedOnMyObj: "string",

  listStringProp1: ["test"],
  // @ts-expect-error - Expected: invalid
  listStringProp2: [1],
  // @ts-expect-error - Expected: invalid
  listStringProp3: null,
  nullableListStringProp1: null,
  nullableListStringProp2: ["test"],
  // @ts-expect-error - Expected: invalid
  nullableListStringProp3: [1],
  listStringOrUndefinedProp1: undefined,
  listStringOrUndefinedProp2: ["test"],
  // @ts-expect-error - Expected: invalid
  listStringOrUndefinedProp3: [1],
};
test;

// Extended functionality tests (ensure RequiredProperties work)
class RealmClassWithRequiredParams extends Realm.Object<
  RealmClassWithRequiredParams,
  | "aMandatoryString"
  | "anOptionalString"
  | "aMandatoryBool"
  | "aMandatoryInt"
  | "aMandatoryFloat"
  | "aMandatoryDouble"
  | "aMandatoryDecimal128"
  | "aMandatoryObjectId"
  | "aMandatoryData"
  | "aMandatoryDate"
  | "aMandatoryMixed"
  | "aMandatoryUuid"
> {
  public aMandatoryString!: Realm.Types.String;
  public anOptionalString?: Realm.Types.String;
  public aMandatoryBool!: Realm.Types.Bool;
  public aMandatoryInt!: Realm.Types.Int;
  public aMandatoryFloat!: Realm.Types.Float;
  public aMandatoryDouble!: Realm.Types.Double;
  public aMandatoryDecimal128!: Realm.Types.Decimal128;
  public aMandatoryObjectId!: Realm.Types.ObjectId;
  public aMandatoryData!: Realm.Types.Data;
  public aMandatoryDate!: Realm.Types.Date;
  public aMandatoryMixed!: Realm.Types.Mixed;
  public aMandatoryUuid!: Realm.Types.UUID;

  static schema: Realm.ObjectSchema = {
    name: "RealmClassWithRequiredParams",
    properties: {
      aMandatoryString: "string",
      anOptionalString: "string?",
      aMandatoryBool: "bool",
      aMandatoryInt: "int",
      aMandatoryFloat: "float",
      aMandatoryDouble: "double",
      aMandatoryDecimal128: "decimal128",
      aMandatoryObjectId: "objectId",
      aMandatoryData: "data",
      aMandatoryDate: "date",
      // TODO list
      // TODO linkingObjects?
      // TODO dictionary
      // TODO set
      aMandatoryMixed: "mixed",
      aMandatoryUuid: "uuid",
    },
  };

  public someFunction() {
    return 1;
  }
}

class RealmClassWithoutRequiredParams extends Realm.Object<RealmClassWithoutRequiredParams> {
  public aMandatoryString!: Realm.Types.String;
  public anOptionalString?: Realm.Types.String;
  public aMandatoryBool!: Realm.Types.Bool;
  public aMandatoryInt!: Realm.Types.Int;
  public aMandatoryFloat!: Realm.Types.Float;
  public aMandatoryDouble!: Realm.Types.Double;
  public aMandatoryDecimal128!: Realm.Types.Decimal128;
  public aMandatoryObjectId!: Realm.Types.ObjectId;
  public aMandatoryData!: Realm.Types.Data;
  public aMandatoryDate!: Realm.Types.Date;
  public aMandatoryMixed!: Realm.Types.Mixed;
  public aMandatoryUuid!: Realm.Types.UUID;

  static schema: Realm.ObjectSchema = {
    name: "RealmClassWithoutRequiredParams",
    properties: {
      aMandatoryString: "string",
      anOptionalString: "string?",
      aMandatoryBool: "bool",
      aMandatoryInt: "int",
      aMandatoryFloat: "float",
      aMandatoryDouble: "double",
      aMandatoryDecimal128: "decimal128",
      aMandatoryObjectId: "objectId",
      aMandatoryData: "data",
      aMandatoryDate: "date",
      aMandatoryMixed: "mixed",
      aMandatoryUuid: "uuid",
    },
  };

  public someFunction() {
    return 1;
  }
}

const realm = new Realm({ schema: [RealmClassWithRequiredParams, RealmClassWithoutRequiredParams] });

// @ts-expect-error - a String shouldn't be accepted as 'values'
new RealmClassWithRequiredParams(realm, "this shouldn't be accepted");

// TODO - this doesn't error and it should
// should-be-@ts-expect-error - a String shouldn't be accepted as 'values'
new RealmClassWithoutRequiredParams(realm, "this shouldn't be accepted");

// Realm.create() tests

realm.write(() => {
  // === Realm.Object classes ===
  // @ts-expect-error - Empty object not allowed due to being required params
  realm.create(RealmClassWithRequiredParams, new RealmClassWithRequiredParams(realm, {}));

  realm.create(
    RealmClassWithRequiredParams,
    new RealmClassWithRequiredParams(realm, {
      aMandatoryString: "string",
      // anOptionalString is a required param, but it's of type "string?" so doesn't need to be specified
      aMandatoryBool: true,
      aMandatoryInt: 1,
      aMandatoryFloat: 1.2,
      aMandatoryDouble: 1.3,
      aMandatoryDecimal128: new BSON.Decimal128("123"),
      aMandatoryObjectId: new BSON.ObjectId(123),
      aMandatoryData: new ArrayBuffer(123),
      aMandatoryDate: new Date(),
      aMandatoryMixed: "a",
      aMandatoryUuid: new BSON.UUID(),
    }),
  );

  realm.create(RealmClassWithoutRequiredParams, new RealmClassWithoutRequiredParams(realm, {}));

  // === Unmanaged objects ===
  // TODO - Should this be erroring? The class has required types so shouldn't they be automatically required in the Unmanaged version too? Is this possible
  // should-be-@ts-expect-error - Empty object not allowed due to being required params
  realm.create(RealmClassWithRequiredParams, {});

  realm.create(RealmClassWithRequiredParams, {
    aMandatoryString: "string",
    // anOptionalString is a required param, but it's of type "string?" so doesn't need to be specified
    aMandatoryBool: true,
    aMandatoryInt: 1,
    aMandatoryFloat: 1.2,
    aMandatoryDouble: 1.3,
    aMandatoryDecimal128: new BSON.Decimal128("123"),
    aMandatoryObjectId: new BSON.ObjectId(123),
    aMandatoryData: new ArrayBuffer(123),
    aMandatoryDate: new Date(),
    aMandatoryMixed: 1,
    aMandatoryUuid: new BSON.UUID(),
  });

  realm.create(RealmClassWithoutRequiredParams, {});
});

// Shouldn't be expecting someFunction(), keys(), entries(), etc
const realmObjectPropertiesOmitted1: Realm.Unmanaged<RealmClassWithRequiredParams> = {};

const realmObjectPropertiesOmitted2: Realm.Unmanaged<
  RealmClassWithRequiredParams,
  | "aMandatoryString"
  | "anOptionalString"
  | "aMandatoryBool"
  | "aMandatoryInt"
  | "aMandatoryFloat"
  | "aMandatoryDouble"
  | "aMandatoryDecimal128"
  | "aMandatoryObjectId"
  | "aMandatoryData"
  | "aMandatoryDate"
  | "aMandatoryMixed"
  | "aMandatoryUuid"
> = {
  aMandatoryString: "string",
  aMandatoryBool: true,
  aMandatoryInt: 1,
  aMandatoryFloat: 1.2,
  aMandatoryDouble: 1.3,
  aMandatoryDecimal128: new BSON.Decimal128("123"),
  aMandatoryObjectId: new BSON.ObjectId(123),
  aMandatoryData: new ArrayBuffer(123),
  aMandatoryDate: new Date(),
  aMandatoryMixed: true,
  aMandatoryUuid: new BSON.UUID(),
};
