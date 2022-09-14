"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePropertyCode = exports.generatePropertyVariants = void 0;
const TYPE_NAME_VARIANTS = {
    bool: ["boolean", "Realm.Types.Bool", "Types.Bool"],
    string: ["string", "Realm.Types.String", "Types.String"],
    int: ["Realm.Types.Int", "Types.Int"],
    float: ["Realm.Types.Float", "Types.Float"],
    double: ["number", "Realm.Types.Double", "Types.Double"],
    decimal128: ["Realm.Types.Decimal128", "Types.Decimal128", "Realm.BSON.Decimal128", "BSON.Decimal128"],
    objectId: ["Realm.Types.ObjectId", "Types.ObjectId", "Realm.BSON.ObjectId", "BSON.ObjectId"],
    uuid: ["Realm.Types.UUID", "Types.UUID", "Realm.BSON.UUID", "BSON.UUID"],
    date: ["Date", "Types.Date", "Realm.Types.Date"],
    data: ["ArrayBuffer", "Types.Data", "Realm.Types.Data"],
    list: ["Realm.List", "Realm.Types.List", "Types.List", "List"],
    set: ["Realm.Set", "Realm.Types.Set", "Types.Set", "Set"],
    dictionary: ["Realm.Dictionary", "Realm.Types.Dictionary", "Types.Dictionary", "Dictionary"],
    mixed: ["Realm.Mixed", "Mixed"],
};
const DEFAULT_INFERABLE_TYPES = new Set([
    "bool",
    "string",
    "double",
    "decimal128",
    "objectId",
    "uuid",
    "date",
    "data",
]);
const COLLECTION_TYPES = new Set(["list", "set", "dictionary"]);
function generateTypeNameVariants(type) {
    if (typeof type === "undefined") {
        return [undefined]; // Pass through
    }
    else if (type in TYPE_NAME_VARIANTS) {
        // Returning a copy to prevent caller from pushing to the original
        return [...TYPE_NAME_VARIANTS[type]];
    }
    else {
        // Assuming this is name of an object schema
        return [type];
    }
}
function isSourceDefault(d) {
    if (typeof d === "object" && d !== null && typeof d.source === "string") {
        return true;
    }
    else {
        return false;
    }
}
function getInitializer(d) {
    if (isSourceDefault(d)) {
        return d.source;
    }
    else {
        return JSON.stringify(d);
    }
}
var OptionalVariant;
(function (OptionalVariant) {
    OptionalVariant["Required"] = "required";
    OptionalVariant["QuestionMark"] = "question-mark";
    OptionalVariant["UnknownBeforeType"] = "unknown-before-type";
    OptionalVariant["UnknownAfterType"] = "unknown-after-type";
})(OptionalVariant || (OptionalVariant = {}));
function generateOptionalVariants({ optional, type }) {
    if (!optional) {
        return [OptionalVariant.Required];
    }
    else if (COLLECTION_TYPES.has(type)) {
        return [OptionalVariant.UnknownBeforeType, OptionalVariant.UnknownAfterType];
    }
    else {
        return [OptionalVariant.QuestionMark, OptionalVariant.UnknownBeforeType, OptionalVariant.UnknownAfterType];
    }
}
/**
 * @param type A type
 * @param optional The current optional variant
 * @returns Augmented type to reflect the optional variant
 */
function unionUndefined(type, optional) {
    if (optional === OptionalVariant.UnknownBeforeType) {
        return `undefined | ${type}`;
    }
    else if (optional === OptionalVariant.UnknownAfterType) {
        return `${type} | undefined`;
    }
    else {
        return type;
    }
}
// TODO: Consider generating variants for optional properties where both question mark and undefined before/after type are used
function generatePropertyVariants(options) {
    const variants = [];
    const typeVariants = generateTypeNameVariants(options.type);
    if (DEFAULT_INFERABLE_TYPES.has(options.type) && typeof options.default !== "undefined") {
        typeVariants.push(undefined);
    }
    for (const type of typeVariants) {
        for (const typeArgument of generateTypeNameVariants(options.objectType)) {
            for (const optional of generateOptionalVariants(options)) {
                if (typeof type === "undefined" &&
                    (optional === OptionalVariant.UnknownBeforeType || optional === OptionalVariant.UnknownAfterType)) {
                    // Skip pre- and appending undefined when the type is missing
                    continue;
                }
                variants.push({
                    name: options.name,
                    type: typeArgument ? type : unionUndefined(type, optional),
                    typeArgument: typeArgument ? unionUndefined(typeArgument, optional) : typeArgument,
                    initializer: getInitializer(options.default),
                    questionMark: optional === OptionalVariant.QuestionMark,
                });
            }
        }
    }
    return variants;
}
exports.generatePropertyVariants = generatePropertyVariants;
function generatePropertyCode({ name, questionMark, type, typeArgument, initializer }) {
    let result = name;
    if (questionMark) {
        result += "?";
    }
    if (typeof type === "string") {
        result += ": ";
        result += type;
    }
    if (typeArgument) {
        result += `<${typeArgument}>`;
    }
    if (initializer) {
        result += ` = ${initializer}`;
    }
    result += ";";
    return result;
}
exports.generatePropertyCode = generatePropertyCode;
