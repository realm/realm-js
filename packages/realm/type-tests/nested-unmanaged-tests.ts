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

import Realm from "realm";

class RealmClassWithRequiredParams extends Realm.Object<
  RealmClassWithRequiredParams,
  "aMandatoryString" | "anOptionalString" | "aMandatoryBool" | "aMandatoryInt"
> {
  public aMandatoryString!: Realm.Types.String;
  public anOptionalString?: Realm.Types.String;
  public aMandatoryBool!: Realm.Types.Bool;
  public aMandatoryInt!: Realm.Types.Int;

  static schema: Realm.ObjectSchema = {
    name: "RealmClassWithRequiredParams",
    properties: {
      aMandatoryString: "string",
      anOptionalString: "string?",
      aMandatoryBool: "bool",
      aMandatoryInt: "int",
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

  static schema: Realm.ObjectSchema = {
    name: "RealmClassWithoutRequiredParams",
    properties: {
      aMandatoryString: "string",
      anOptionalString: "string?",
      aMandatoryBool: "bool",
      aMandatoryInt: "int",
    },
  };

  public someFunction() {
    return 1;
  }
}

const realm = new Realm({ schema: [RealmClassWithRequiredParams, RealmClassWithoutRequiredParams] });

// @ts-expect-error - a String shouldn't be accepted as 'values'
new RealmClassWithRequiredParams(realm, "this shouldn't be accepted");

// FIXME - this doesn't error and it should
// @xxxts-expect-error - a String shouldn't be accepted as 'values'
new RealmClassWithoutRequiredParams(realm, "this shouldn't be accepted");

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
    }),
  );

  realm.create(RealmClassWithoutRequiredParams, new RealmClassWithoutRequiredParams(realm, {}));

  // === Unmanaged objects ===
  // FIXME - Should this be erroring? The class has required types so shouldn't they be automatically required in the Unmanaged version too? Is this possible
  // @xxxts-expect-error - Empty object not allowed due to being required params
  realm.create(RealmClassWithRequiredParams, {});

  realm.create(RealmClassWithRequiredParams, {
    aMandatoryString: "string",
    // anOptionalString is a required param, but it's of type "string?" so doesn't need to be specified
    aMandatoryBool: true,
    aMandatoryInt: 1,
  });

  realm.create(RealmClassWithoutRequiredParams, {});
});

// Shouldn't be expecting someFunction(), keys(), entries(), etc
const realmObjectPropertiesOmitted1: Realm.Unmanaged<RealmClassWithRequiredParams> = {};

const realmObjectPropertiesOmitted2: Realm.Unmanaged<
  RealmClassWithRequiredParams,
  "aMandatoryString" | "anOptionalString" | "aMandatoryBool" | "aMandatoryInt"
> = {
  aMandatoryString: "string",
  aMandatoryBool: true,
  aMandatoryInt: 1,
};
