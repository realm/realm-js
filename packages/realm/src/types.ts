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

import { Decimal128, ObjectId, UUID } from "bson";

import { assert } from "./assert";
import * as binding from "./binding";
import { ClassHelpers } from "./ClassHelpers";
import { TypeAssertionError } from "./errors";
import { Collection } from "./Collection";
import { getInternal } from "./internal";
import { Object as RealmObject, UpdateMode } from "./Object";
import type { Realm } from "./Realm";

/** @internal */
export type TypeHelpers = {
  toBinding(value: unknown): binding.MixedArg;
  fromBinding(value: unknown): unknown;
};

export type TypeOptions = {
  realm: Realm;
  name: string;
  optional: boolean;
  objectType: string | undefined;
  getClassHelpers(nameOrTableKey: string | binding.TableKey): ClassHelpers;
};

function defaultToBinding(value: unknown): binding.MixedArg {
  return value as binding.MixedArg;
}

function defaultFromBinding(value: unknown) {
  return value;
}

/**
 * Adds a branch to a function, which checks for the argument to be null, in which case it returns early.
 */
function nullPassthrough<T, F extends (value: unknown) => unknown>(this: T, fn: F, enabled: boolean): F {
  if (enabled) {
    return ((value) => (value === null ? null : fn.call(this, value))) as F;
  } else {
    return fn;
  }
}

const TYPES_MAPPING: Record<binding.PropertyType, (options: TypeOptions) => TypeHelpers> = {
  [binding.PropertyType.Int]({ optional }) {
    return {
      toBinding(value) {
        if (value === null && optional) {
          return null;
        } else if (typeof value === "number") {
          return BigInt(value);
        } else if (typeof value === "bigint") {
          return value;
        } else {
          throw new TypeAssertionError("a number or bigint", value);
        }
      },
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
        if (value instanceof Uint8Array) {
          return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
        } else {
          assert.instanceOf(value, ArrayBuffer);
          return value;
        }
      }, optional),
      fromBinding: defaultFromBinding,
    };
  },
  [binding.PropertyType.Date]({ optional }) {
    return {
      toBinding: nullPassthrough((value) => {
        assert.instanceOf(value, Date);
        return binding.Timestamp.fromDate(value);
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
      toBinding: nullPassthrough((value) => {
        if (value instanceof RealmObject) {
          assert.instanceOf(value, helpers.constructor);
          return getInternal(value);
        } else {
          assert.object(value, name);
          // Some other object is assumed to be an unmanged object, that the user wants to create
          const createdObject = RealmObject.create(realm, helpers, value, UpdateMode.Never);
          return getInternal(createdObject);
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
  [binding.PropertyType.Mixed]({ realm, getClassHelpers }) {
    return {
      toBinding(value) {
        if (value instanceof Date) {
          return binding.Timestamp.fromDate(value);
        } else if (value instanceof RealmObject) {
          return getInternal(value);
        } else if (value instanceof Collection) {
          throw new Error(`Using a ${value.constructor.name} as Mixed value, is not yet supported`);
        } else {
          return value as binding.Mixed;
        }
      },
      fromBinding(value) {
        if (typeof value === "bigint") {
          return Number(value);
        } else if (value instanceof binding.Timestamp) {
          return value.toDate();
        } else if (value instanceof binding.Float) {
          return value.value;
        } else if (value instanceof binding.ObjLink) {
          const table = binding.Helpers.getTable(realm.internal, value.tableKey);
          const linkedObj = table.getObject(value.objKey);
          const { wrapObject } = getClassHelpers(value.tableKey);
          return wrapObject(linkedObj);
        } else {
          return value;
        }
      },
    };
  },
  [binding.PropertyType.ObjectId]({ optional }) {
    return {
      toBinding: nullPassthrough((value) => {
        assert.instanceOf(value, ObjectId);
        return value;
      }, optional),
      fromBinding: defaultFromBinding,
    };
  },
  [binding.PropertyType.Decimal]({ optional }) {
    return {
      toBinding: nullPassthrough((value) => {
        assert.instanceOf(value, Decimal128);
        return value;
      }, optional),
      fromBinding: defaultFromBinding,
    };
  },
  [binding.PropertyType.UUID]({ optional }) {
    return {
      toBinding: nullPassthrough((value) => {
        assert.instanceOf(value, UUID);
        return value;
      }, optional),
      fromBinding: defaultFromBinding,
    };
  },
  [binding.PropertyType.Array]() {
    return {
      fromBinding() {
        throw new Error("Not supported");
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

export function getHelpers(type: binding.PropertyType, options: TypeOptions): TypeHelpers {
  const helpers = TYPES_MAPPING[type];
  assert(helpers, `Unexpected type ${type}`);
  return helpers(options);
}
