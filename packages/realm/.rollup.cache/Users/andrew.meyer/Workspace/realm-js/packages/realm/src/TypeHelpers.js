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
import { BSON, Collection, INTERNAL, List, REALM, RealmObject, TypeAssertionError, UpdateMode, assert, binding, } from "./internal";
const TYPED_ARRAY_CONSTRUCTORS = new Set([
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
    BigInt64Array,
    BigUint64Array,
]);
export function toArrayBuffer(value, stringToBase64 = true) {
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
// TODO: Consider testing for expected object instance types and throw something simular to the legacy SDK:
// "Only Realm instances are supported." (which should probably have been "Realm.Object")
// instead of relying on the binding to throw.
export function mixedToBinding(realm, value) {
    if (typeof value === "undefined") {
        return null;
    }
    else if (value instanceof Date) {
        return binding.Timestamp.fromDate(value);
    }
    else if (value instanceof RealmObject) {
        const otherRealm = value[REALM].internal;
        assert.isSameRealm(realm, otherRealm, "Realm object is from another Realm");
        return value[INTERNAL];
    }
    else if (value instanceof Collection) {
        throw new Error(`Using a ${value.constructor.name} as Mixed value, is not yet supported`);
    }
    else if (Array.isArray(value)) {
        throw new TypeError("A mixed property cannot contain an array of values.");
    }
    else {
        return value;
    }
}
function defaultToBinding(value) {
    return value;
}
function defaultFromBinding(value) {
    return value;
}
/**
 * Adds a branch to a function, which checks for the argument to be null, in which case it returns early.
 */
function nullPassthrough(fn, enabled) {
    if (enabled) {
        return ((value, ...rest) => typeof value === "undefined" || value === null ? null : fn.call(this, value, ...rest));
    }
    else {
        return fn;
    }
}
const TYPES_MAPPING = {
    [0 /* binding.PropertyType.Int */]({ optional }) {
        return {
            toBinding: nullPassthrough((value) => {
                if (typeof value === "number") {
                    return BigInt(value);
                }
                else if (typeof value === "bigint") {
                    return value;
                }
                else {
                    throw new TypeAssertionError("a number or bigint", value);
                }
            }, optional),
            // TODO: Support returning bigints to end-users
            fromBinding: nullPassthrough((value) => Number(value), optional),
        };
    },
    [1 /* binding.PropertyType.Bool */]({ optional }) {
        return {
            toBinding: nullPassthrough((value) => {
                assert.boolean(value);
                return value;
            }, optional),
            fromBinding: defaultFromBinding,
        };
    },
    [2 /* binding.PropertyType.String */]({ optional }) {
        return {
            toBinding: nullPassthrough((value) => {
                assert.string(value);
                return value;
            }, optional),
            fromBinding: defaultFromBinding,
        };
    },
    [3 /* binding.PropertyType.Data */]({ optional }) {
        return {
            toBinding: nullPassthrough((value) => {
                return toArrayBuffer(value);
            }, optional),
            fromBinding: defaultFromBinding,
        };
    },
    [4 /* binding.PropertyType.Date */]({ optional }) {
        return {
            toBinding: nullPassthrough((value) => {
                if (typeof value === "string") {
                    // TODO: Consider deprecating this undocumented type coercion
                    return binding.Timestamp.fromDate(new Date(value));
                }
                else {
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
    [5 /* binding.PropertyType.Float */]({ optional }) {
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
    [6 /* binding.PropertyType.Double */]({ optional }) {
        return {
            toBinding: nullPassthrough((value) => {
                assert.number(value);
                return value;
            }, optional),
            fromBinding: defaultFromBinding,
        };
    },
    [7 /* binding.PropertyType.Object */]({ realm, name, objectType, optional, getClassHelpers }) {
        assert(objectType);
        const helpers = getClassHelpers(objectType);
        const { wrapObject } = helpers;
        return {
            toBinding: nullPassthrough((value, createObj) => {
                if (value instanceof helpers.constructor) {
                    return value[INTERNAL];
                }
                else {
                    // TODO: Consider exposing a way for calling code to disable object creation
                    assert.object(value, name);
                    // Some other object is assumed to be an unmanged object, that the user wants to create
                    const createdObject = RealmObject.create(realm, value, UpdateMode.Never, {
                        helpers,
                        createObj,
                    });
                    return createdObject[INTERNAL];
                }
            }, optional),
            fromBinding: nullPassthrough((value) => {
                if (value instanceof binding.ObjLink) {
                    const table = binding.Helpers.getTable(realm.internal, value.tableKey);
                    const linkedObj = table.getObject(value.objKey);
                    return wrapObject(linkedObj);
                }
                else {
                    assert.instanceOf(value, binding.Obj);
                    return wrapObject(value);
                }
            }, optional),
        };
    },
    [8 /* binding.PropertyType.LinkingObjects */]({ objectType, getClassHelpers }) {
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
    [9 /* binding.PropertyType.Mixed */]({ realm, getClassHelpers }) {
        return {
            toBinding: mixedToBinding.bind(null, realm.internal),
            fromBinding(value) {
                if (typeof value === "bigint") {
                    return Number(value);
                }
                else if (value instanceof binding.Timestamp) {
                    return value.toDate();
                }
                else if (value instanceof binding.Float) {
                    return value.value;
                }
                else if (value instanceof binding.ObjLink) {
                    const table = binding.Helpers.getTable(realm.internal, value.tableKey);
                    const linkedObj = table.getObject(value.objKey);
                    const { wrapObject } = getClassHelpers(value.tableKey);
                    return wrapObject(linkedObj);
                }
                else {
                    return value;
                }
            },
        };
    },
    [10 /* binding.PropertyType.ObjectId */]({ optional }) {
        return {
            toBinding: nullPassthrough((value) => {
                assert.instanceOf(value, BSON.ObjectId);
                return value;
            }, optional),
            fromBinding: defaultFromBinding,
        };
    },
    [11 /* binding.PropertyType.Decimal */]({ optional }) {
        return {
            toBinding: nullPassthrough((value) => {
                assert.instanceOf(value, BSON.Decimal128);
                return value;
            }, optional),
            fromBinding: defaultFromBinding,
        };
    },
    [12 /* binding.PropertyType.UUID */]({ optional }) {
        return {
            toBinding: nullPassthrough((value) => {
                assert.instanceOf(value, BSON.UUID);
                return value;
            }, optional),
            fromBinding: defaultFromBinding,
        };
    },
    [128 /* binding.PropertyType.Array */]({ realm, getClassHelpers, name, objectSchemaName }) {
        assert.string(objectSchemaName, "objectSchemaName");
        const classHelpers = getClassHelpers(objectSchemaName);
        return {
            fromBinding(value) {
                assert.instanceOf(value, binding.List);
                const propertyHelpers = classHelpers.properties.get(name);
                const collectionHelpers = propertyHelpers.collectionHelpers;
                assert.object(collectionHelpers);
                return new List(realm, value, collectionHelpers);
            },
            toBinding() {
                throw new Error("Not supported");
            },
        };
    },
    [256 /* binding.PropertyType.Set */]() {
        return {
            fromBinding() {
                throw new Error("Not yet supported");
            },
            toBinding() {
                throw new Error("Not yet supported");
            },
        };
    },
    [512 /* binding.PropertyType.Dictionary */]() {
        return {
            fromBinding() {
                throw new Error("Not supported");
            },
            toBinding() {
                throw new Error("Not supported");
            },
        };
    },
    [64 /* binding.PropertyType.Nullable */]() {
        throw new Error("Not directly mappable");
    },
    [896 /* binding.PropertyType.Collection */]() {
        throw new Error("Not directly mappable");
    },
    [960 /* binding.PropertyType.Flags */]() {
        throw new Error("Not directly mappable");
    },
};
export function getTypeHelpers(type, options) {
    const helpers = TYPES_MAPPING[type];
    assert(helpers, `Unexpected type ${type}`);
    return helpers(options);
}
//# sourceMappingURL=TypeHelpers.js.map