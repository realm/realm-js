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
import { getInternal } from "./internal";
import { Object as RealmObject } from "./Object";

/** @internal */
export type TypeHelpers = {
  toBinding(value: unknown): binding.MixedArg;
  fromBinding(value: unknown): unknown;
};

export type TypeOptions = {
  realm: binding.Realm;
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

const TYPES_MAPPING: Record<binding.PropertyType, (options: TypeOptions) => TypeHelpers> = {
  [binding.PropertyType.Int]({ optional }) {
    return {
      toBinding(value: unknown) {
        if (value === null && optional) {
          return null;
        } else if (typeof value === "number") {
          return BigInt(value);
        } else if (typeof value === "bigint") {
          return value;
        } else {
          throw new TypeError(`Expected a number or bigint, got ${typeof value}`);
        }
      },
      fromBinding(value: unknown) {
        // TODO: Support returning bigints to end-users
        return Number(value);
      },
    };
  },
  [binding.PropertyType.Bool]({ optional }) {
    return {
      toBinding: optional
        ? (value: unknown) => {
            if (value === null) {
              return null;
            }
            assert.boolean(value);
            return value;
          }
        : (value: unknown) => {
            assert.boolean(value);
            return value;
          },
      fromBinding: defaultFromBinding,
    };
  },
  [binding.PropertyType.String]({ optional }) {
    return {
      toBinding: optional
        ? (value: unknown) => {
            if (value === null) {
              return null;
            }
            assert.string(value);
            return value;
          }
        : (value: unknown) => {
            assert.string(value);
            return value;
          },
      fromBinding: defaultFromBinding,
    };
  },
  [binding.PropertyType.Data]({ optional }) {
    return {
      toBinding: optional
        ? (value) => {
            if (value === null) {
              return null;
            }
            assert.instanceOf(value, ArrayBuffer);
            return value;
          }
        : (value) => {
            assert.instanceOf(value, ArrayBuffer);
            return value;
          },
      fromBinding: defaultFromBinding,
    };
  },
  [binding.PropertyType.Date]({ optional }) {
    return {
      toBinding: optional
        ? (value) => {
            if (value === null) {
              return null;
            }
            assert.instanceOf(value, Date);
            return binding.Timestamp.fromDate(value);
          }
        : (value) => {
            assert.instanceOf(value, Date);
            return binding.Timestamp.fromDate(value);
          },
      fromBinding(value) {
        assert.instanceOf(value, binding.Timestamp);
        return value.toDate();
      },
    };
  },
  [binding.PropertyType.Float]({ optional }) {
    return {
      toBinding: optional
        ? (value) => {
            if (value === null) {
              return null;
            }
            assert.number(value);
            return new binding.Float(value);
          }
        : (value) => {
            assert.number(value);
            return new binding.Float(value);
          },
      fromBinding(value) {
        assert.instanceOf(value, binding.Float);
        return value.value;
      },
    };
  },
  [binding.PropertyType.Double]({ optional }) {
    return {
      toBinding: optional
        ? (value) => {
            if (value === null) {
              return null;
            }
            assert.number(value);
            return value;
          }
        : (value) => {
            assert.number(value);
            return value;
          },
      fromBinding: defaultFromBinding,
    };
  },
  [binding.PropertyType.Object]({ realm, objectType, getClassHelpers }) {
    assert(objectType);
    const { wrapObject } = getClassHelpers(objectType);
    return {
      toBinding(value) {
        if (value === null) {
          return null;
        }
        assert.instanceOf(value, RealmObject);
        return getInternal(value);
      },
      fromBinding(this: TypeHelpers, value: unknown) {
        if (value === null) {
          return null;
        } else if (value instanceof binding.ObjLink) {
          const table = binding.Helpers.getTable(realm, value.tableKey);
          const linkedObj = table.getObject(value.objKey);
          return this.fromBinding(linkedObj);
        } else {
          assert.instanceOf(value, binding.Obj);
          return wrapObject(value);
        }
      },
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
          const table = binding.Helpers.getTable(realm, value.tableKey);
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
      toBinding: optional
        ? (value) => {
            if (value === null) {
              return null;
            }
            assert.instanceOf(value, ObjectId);
            return value;
          }
        : (value) => {
            assert.instanceOf(value, ObjectId);
            return value;
          },
      fromBinding: defaultFromBinding,
    };
  },
  [binding.PropertyType.Decimal]({ optional }) {
    return {
      toBinding: optional
        ? (value) => {
            if (value === null) {
              return null;
            }
            assert.instanceOf(value, Decimal128);
            return value;
          }
        : (value) => {
            assert.instanceOf(value, Decimal128);
            return value;
          },
      fromBinding: defaultFromBinding,
    };
  },
  [binding.PropertyType.UUID]({ optional }) {
    return {
      toBinding: optional
        ? (value) => {
            if (value === null) {
              return null;
            }
            assert.instanceOf(value, UUID);
            return value;
          }
        : (value) => {
            assert.instanceOf(value, UUID);
            return value;
          },
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
