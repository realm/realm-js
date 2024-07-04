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

import {
  Collection,
  Counter,
  Dictionary,
  INTERNAL,
  List,
  REALM,
  RealmObject,
  RealmSet,
  assert,
  binding,
  boxToBindingGeospatial,
  circleToBindingGeospatial,
  createDictionaryAccessor,
  createListAccessor,
  getTypeHelpers,
  isGeoBox,
  isGeoCircle,
  isGeoPolygon,
  polygonToBindingGeospatial,
} from "../internal";
import { TYPED_ARRAY_CONSTRUCTORS } from "./array-buffer";
import { TypeHelpers, TypeOptions } from "./types";

// TODO: Consider testing for expected object instance types and throw something similar to the legacy SDK:
// "Only Realm instances are supported." (which should probably have been "RealmObject")
// instead of relying on the binding to throw.
/**
 * Convert an SDK value to a Binding value representation.
 * @param realm The Realm used.
 * @param value The value to convert.
 * @param options Options needed.
 * @param options.isQueryArg Whether the value to convert is a query argument used
 *  for `OrderedCollection.filtered()`. If so, this will be validated differently.
 * @returns The `MixedArg` binding representation.
 * @internal
 */
export function mixedToBinding(
  realm: binding.Realm,
  value: unknown,
  { isQueryArg } = { isQueryArg: false },
): binding.MixedArg {
  const displayedType = isQueryArg ? "a query argument" : "a Mixed value";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null) {
    // Fast track pass through for the most commonly used types
    return value;
  } else if (value === undefined) {
    return null;
  } else if (value instanceof Date) {
    return binding.Timestamp.fromDate(value);
  } else if (value instanceof RealmObject) {
    if (value.objectSchema().embedded) {
      throw new Error(`Using an embedded object (${value.constructor.name}) as ${displayedType} is not supported.`);
    }
    const otherRealm = value[REALM].internal;
    assert.isSameRealm(realm, otherRealm, "Realm object is from another Realm");
    return value[INTERNAL];
  } else if (value instanceof RealmSet || value instanceof Set) {
    throw new Error(`Using a ${value.constructor.name} as ${displayedType} is not supported.`);
  } else if (value instanceof Counter) {
    let errMessage = `Using a Counter as ${displayedType} is not supported.`;
    errMessage += isQueryArg ? " Use 'Counter.value'." : "";
    throw new Error(errMessage);
  } else {
    if (isQueryArg) {
      if (value instanceof Collection || Array.isArray(value)) {
        throw new Error(`Using a ${value.constructor.name} as a query argument is not supported.`);
      }
      // Geospatial types can currently only be used when querying and
      // are not yet supported as standalone data types in the schema.
      if (typeof value === "object") {
        if (isGeoCircle(value)) {
          return circleToBindingGeospatial(value);
        } else if (isGeoBox(value)) {
          return boxToBindingGeospatial(value);
        } else if (isGeoPolygon(value)) {
          return polygonToBindingGeospatial(value);
        }
      }
    }

    // Convert typed arrays to an `ArrayBuffer`
    for (const TypedArray of TYPED_ARRAY_CONSTRUCTORS) {
      if (value instanceof TypedArray) {
        return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
      }
    }

    // Rely on the binding for any other value
    return value as binding.MixedArg;
  }
}

/** @internal */
function mixedFromBinding(options: TypeOptions, value: binding.MixedArg): unknown {
  const { realm, getClassHelpers } = options;
  if (binding.Int64.isInt(value)) {
    return binding.Int64.intToNum(value);
  } else if (value instanceof binding.Timestamp) {
    return value.toDate();
  } else if (value instanceof binding.Float) {
    return value.value;
  } else if (value instanceof binding.ObjLink) {
    const table = binding.Helpers.getTable(realm.internal, value.tableKey);
    const linkedObj = table.getObject(value.objKey);
    const { wrapObject } = getClassHelpers(value.tableKey);
    return wrapObject(linkedObj);
  } else if (value instanceof binding.List) {
    const mixedType = binding.PropertyType.Mixed;
    const typeHelpers = getTypeHelpers(mixedType, options);
    return new List(realm, value, createListAccessor({ realm, typeHelpers, itemType: mixedType }), typeHelpers);
  } else if (value instanceof binding.Dictionary) {
    const mixedType = binding.PropertyType.Mixed;
    const typeHelpers = getTypeHelpers(mixedType, options);
    return new Dictionary(
      realm,
      value,
      createDictionaryAccessor({ realm, typeHelpers, itemType: mixedType }),
      typeHelpers,
    );
  } else {
    return value;
  }
}

/** @internal */
export function createMixedTypeHelpers(options: TypeOptions): TypeHelpers {
  return {
    toBinding: mixedToBinding.bind(null, options.realm.internal),
    fromBinding: mixedFromBinding.bind(null, options),
  };
}
