////////////////////////////////////////////////////////////////////////////
//
// Copyright 2022 Realm Inc.
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
  BSON,
  ClassHelpers,
  Collection,
  Dictionary,
  INTERNAL,
  List,
  ObjCreator,
  REALM,
  Realm,
  RealmObject,
  RealmSet,
  TypeAssertionError,
  UpdateMode,
  assert,
  binding,
  boxToBindingGeospatial,
  circleToBindingGeospatial,
  createDictionaryAccessor,
  createListAccessor,
  isGeoBox,
  isGeoCircle,
  isGeoPolygon,
  polygonToBindingGeospatial,
  safeGlobalThis,
} from "./internal";

const TYPED_ARRAY_CONSTRUCTORS = new Set(
  [
    DataView,
    Int8Array,
    Uint8Array,
    Uint8ClampedArray,
    Int16Array,
    Uint16Array,
    Int32Array,
    Uint32Array,
    Float32Array,
    Float64Array,
    // These will not be present on old versions of JSC without BigInt support.
    safeGlobalThis.BigInt64Array,
    safeGlobalThis.BigUint64Array,
  ].filter((ctor) => ctor !== undefined),
);

export function toArrayBuffer(value: unknown, stringToBase64 = true) {
  if (typeof value === "string" && stringToBase64) {
    return binding.Helpers.base64Decode(value);
  }
  for (const TypedArray of TYPED_ARRAY_CONSTRUCTORS) {
    if (value instanceof TypedArray) {
      return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
    }
  }
  assert.instanceOf(value, ArrayBuffer);
  return value;
}

/**
 * Helpers for converting a value to and from its binding representation.
 * @internal
 */
export type TypeHelpers<T = unknown> = {
  toBinding(
    value: T,
    options?: { createObj?: ObjCreator; updateMode?: UpdateMode; isQueryArg?: boolean },
  ): binding.MixedArg;
  fromBinding(value: unknown): T;
};

/** @internal */
export type TypeOptions = {
  realm: Realm;
  name: string;
  optional: boolean;
  objectType: string | undefined;
  objectSchemaName: string | undefined;
  getClassHelpers(nameOrTableKey: string | binding.TableKey): ClassHelpers;
};

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
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null) {
    // Fast track pass through for the most commonly used types
    return value;
  } else if (value === undefined) {
    return null;
  } else if (value instanceof Date) {
    return binding.Timestamp.fromDate(value);
  } else if (value instanceof RealmObject) {
    if (value.objectSchema().embedded) {
      throw new Error(`Using an embedded object (${value.constructor.name}) as a Mixed value is not supported.`);
    }
    const otherRealm = value[REALM].internal;
    assert.isSameRealm(realm, otherRealm, "Realm object is from another Realm");
    return value[INTERNAL];
  } else if (value instanceof RealmSet || value instanceof Set) {
    throw new Error(`Using a ${value.constructor.name} as a Mixed value is not supported.`);
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

function defaultToBinding(value: unknown): binding.MixedArg {
  return value as binding.MixedArg;
}

function defaultFromBinding(value: unknown) {
  return value;
}

/**
 * Adds a branch to a function, which checks for the argument to be null, in which case it returns early.
 */
/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Using `unknown` here breaks type inference in `binding.PropertyType.Object` `toBinding` from for some reason */
function nullPassthrough<T, R extends any[], F extends (value: unknown, ...rest: R) => unknown>(
  this: T,
  fn: F,
  enabled: boolean,
): F {
  if (enabled) {
    return ((value, ...rest) =>
      typeof value === "undefined" || value === null ? null : fn.call(this, value, ...rest)) as F;
  } else {
    return fn;
  }
}

const TYPES_MAPPING: Record<binding.PropertyType, (options: TypeOptions) => TypeHelpers> = {
  [binding.PropertyType.Int]({ optional }) {
    return {
      toBinding: nullPassthrough((value) => {
        if (typeof value === "number") {
          return binding.Int64.numToInt(value);
        } else if (binding.Int64.isInt(value)) {
          return value;
        } else {
          throw new TypeAssertionError("a number or bigint", value);
        }
      }, optional),
      // TODO: Support returning bigints to end-users
      fromBinding: nullPassthrough((value) => Number(value), optional),
    };
  },
  [binding.PropertyType.Bool]({ optional }) {
    return {
      toBinding: nullPassthrough((value) => {
        assert.boolean(value);
        return value;
      }, optional),
      fromBinding: defaultFromBinding,
    };
  },
  [binding.PropertyType.String]({ optional }) {
    return {
      toBinding: nullPassthrough((value) => {
        assert.string(value);
        return value;
      }, optional),
      fromBinding: defaultFromBinding,
    };
  },
  [binding.PropertyType.Data]({ optional }) {
    return {
      toBinding: nullPassthrough((value) => {
        return toArrayBuffer(value);
      }, optional),
      fromBinding: defaultFromBinding,
    };
  },
  [binding.PropertyType.Date]({ optional }) {
    return {
      toBinding: nullPassthrough((value) => {
        if (typeof value === "string") {
          // TODO: Consider deprecating this undocumented type coercion
          return binding.Timestamp.fromDate(new Date(value));
        } else {
          assert.instanceOf(value, Date);
          return binding.Timestamp.fromDate(value);
        }
      }, optional),
      fromBinding: nullPassthrough((value) => {
        assert.instanceOf(value, binding.Timestamp);
        return value.toDate();
      }, optional),
    };
  },
  [binding.PropertyType.Float]({ optional }) {
    return {
      toBinding: nullPassthrough((value) => {
        assert.number(value);
        return new binding.Float(value);
      }, optional),
      fromBinding: nullPassthrough((value) => {
        assert.instanceOf(value, binding.Float);
        return value.value;
      }, optional),
    };
  },
  [binding.PropertyType.Double]({ optional }) {
    return {
      toBinding: nullPassthrough((value) => {
        assert.number(value);
        return value;
      }, optional),
      fromBinding: defaultFromBinding,
    };
  },
  [binding.PropertyType.Object]({ realm, name, objectType, optional, getClassHelpers }) {
    assert(objectType);
    const helpers = getClassHelpers(objectType);
    const { wrapObject } = helpers;
    return {
      toBinding: nullPassthrough((value, options) => {
        if (
          value instanceof RealmObject &&
          value.constructor.name === objectType &&
          value[REALM].internal.$addr === realm.internal.$addr
        ) {
          return value[INTERNAL];
        } else {
          // TODO: Consider exposing a way for calling code to disable object creation
          assert.object(value, name);
          // Use the update mode if set; otherwise, the object is assumed to be an
          // unmanaged object that the user wants to create.
          // TODO: Ideally use `options?.updateMode` instead of `realm.currentUpdateMode`.
          const createdObject = RealmObject.create(realm, value, realm.currentUpdateMode ?? UpdateMode.Never, {
            helpers,
            createObj: options?.createObj,
          });
          return createdObject[INTERNAL];
        }
      }, optional),
      fromBinding: nullPassthrough((value) => {
        if (value instanceof binding.ObjLink) {
          const table = binding.Helpers.getTable(realm.internal, value.tableKey);
          const linkedObj = table.getObject(value.objKey);
          return wrapObject(linkedObj);
        } else {
          assert.instanceOf(value, binding.Obj);
          return wrapObject(value);
        }
      }, optional),
    };
  },
  [binding.PropertyType.LinkingObjects]({ objectType, getClassHelpers }) {
    assert(objectType);
    const { wrapObject } = getClassHelpers(objectType);
    return {
      toBinding: defaultToBinding,
      fromBinding(value) {
        assert.instanceOf(value, binding.Obj);
        return wrapObject(value);
      },
    };
  },
  [binding.PropertyType.Mixed](options) {
    return {
      toBinding: mixedToBinding.bind(null, options.realm.internal),
      fromBinding: mixedFromBinding.bind(null, options),
    };
  },
  [binding.PropertyType.ObjectId]({ optional }) {
    return {
      toBinding: nullPassthrough((value) => {
        assert.instanceOf(value, BSON.ObjectId);
        return value;
      }, optional),
      fromBinding: defaultFromBinding,
    };
  },
  [binding.PropertyType.Decimal]({ optional }) {
    return {
      toBinding: nullPassthrough((value) => {
        assert.instanceOf(value, BSON.Decimal128);
        return value;
      }, optional),
      fromBinding: defaultFromBinding,
    };
  },
  [binding.PropertyType.Uuid]({ optional }) {
    return {
      toBinding: nullPassthrough((value) => {
        assert.instanceOf(value, BSON.UUID);
        return value;
      }, optional),
      fromBinding: defaultFromBinding,
    };
  },
  [binding.PropertyType.Array]({ realm, getClassHelpers, name, objectSchemaName }) {
    assert.string(objectSchemaName, "objectSchemaName");
    const classHelpers = getClassHelpers(objectSchemaName);

    return {
      fromBinding(value: unknown) {
        assert.instanceOf(value, binding.List);
        const propertyHelpers = classHelpers.properties.get(name);
        const { listAccessor } = propertyHelpers;
        assert.object(listAccessor);
        return new List(realm, value, listAccessor, propertyHelpers);
      },
      toBinding() {
        throw new Error("Not supported");
      },
    };
  },
  [binding.PropertyType.Set]() {
    return {
      fromBinding() {
        throw new Error("Not yet supported");
      },
      toBinding() {
        throw new Error("Not yet supported");
      },
    };
  },
  [binding.PropertyType.Dictionary]() {
    return {
      fromBinding() {
        throw new Error("Not supported");
      },
      toBinding() {
        throw new Error("Not supported");
      },
    };
  },
  [binding.PropertyType.Nullable]() {
    throw new Error("Not directly mappable");
  },
  [binding.PropertyType.Collection]() {
    throw new Error("Not directly mappable");
  },
  [binding.PropertyType.Flags]() {
    throw new Error("Not directly mappable");
  },
};

/** @internal */
export function toItemType(type: binding.PropertyType) {
  return type & ~binding.PropertyType.Flags;
}

export function getTypeHelpers(type: binding.PropertyType, options: TypeOptions): TypeHelpers {
  const helpers = TYPES_MAPPING[type];
  assert(helpers, `Unexpected type ${type}`);
  return helpers(options);
}
