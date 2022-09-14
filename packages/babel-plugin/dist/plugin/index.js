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
const core_1 = require("@babel/core");
const import_checking_1 = require("./import-checking");
// This could be "int" or "double", but we default to "double" because this is how a JS Number is represented internally
const DEFAULT_NUMERIC_TYPE = "double";
const REALM_NAMED_EXPORT = "Realm";
const TYPES_NAMED_EXPORT = "Types";
const BSON_NAMED_EXPORT = "BSON";
function isRealmTypeAlias(path, name, namespace = TYPES_NAMED_EXPORT) {
    if (path.isTSTypeReference()) {
        return isRealmTypeAlias(path.get("typeName"), name, namespace);
    }
    else if (path.isTSQualifiedName() && path.get("right").isIdentifier({ name })) {
        const left = path.get("left");
        if (namespace === null && left.isIdentifier({ name: REALM_NAMED_EXPORT })) {
            // Realm.{{name}}
            return (0, import_checking_1.isImportedFromRealm)(left);
        }
        else if (left.isIdentifier({ name: namespace })) {
            // {{namespace}}.{{name}}
            return (0, import_checking_1.isImportedFromRealm)(left);
        }
        else if (path.get("left").isTSQualifiedName()) {
            // Realm.{{namespace}}.{{name}}
            return (left.isTSQualifiedName() &&
                left.get("left").isIdentifier({ name: REALM_NAMED_EXPORT }) &&
                left.get("right").isIdentifier({ name: namespace }) &&
                (0, import_checking_1.isImportedFromRealm)(path.get("left")));
        }
    }
    else if (path.isIdentifier({ name })) {
        return (0, import_checking_1.isImportedFromRealm)(path);
    }
    return false;
}
function getRealmTypeForTypeArgument(typeParameters) {
    if (typeParameters.isTSTypeParameterInstantiation()) {
        const objectTypePath = typeParameters.get("params")[0];
        return getRealmTypeForTSType(objectTypePath);
    }
}
function getLinkingObjectsError(message) {
    return message + '. Correct syntax is: `fieldName: Realm.LinkingObjects<LinkedObjectType, "invertedPropertyName">`';
}
function getRealmTypeForTSTypeReference(path) {
    const typeName = path.get("typeName");
    const typeParameters = path.get("typeParameters");
    if (isRealmTypeAlias(path, "Bool")) {
        return { type: "bool" };
    }
    else if (isRealmTypeAlias(path, "String")) {
        return { type: "string" };
    }
    else if (isRealmTypeAlias(path, "Int")) {
        return { type: "int" };
    }
    else if (isRealmTypeAlias(path, "Float")) {
        return { type: "float" };
    }
    else if (isRealmTypeAlias(path, "Double")) {
        return { type: "double" };
    }
    else if (isRealmTypeAlias(path, "Decimal128") || isRealmTypeAlias(path, "Decimal128", BSON_NAMED_EXPORT)) {
        return { type: "decimal128" };
    }
    else if (isRealmTypeAlias(path, "ObjectId") || isRealmTypeAlias(path, "ObjectId", BSON_NAMED_EXPORT)) {
        return { type: "objectId" };
    }
    else if (isRealmTypeAlias(path, "UUID") || isRealmTypeAlias(path, "UUID", BSON_NAMED_EXPORT)) {
        return { type: "uuid" };
    }
    else if (isRealmTypeAlias(path, "Date") || typeName.isIdentifier({ name: "Date" })) {
        return { type: "date" };
    }
    else if (isRealmTypeAlias(path, "Data") || typeName.isIdentifier({ name: "ArrayBuffer" })) {
        return { type: "data" };
    }
    else if (isRealmTypeAlias(path, "List") || isRealmTypeAlias(path, "List", null)) {
        const objectType = getRealmTypeForTypeArgument(typeParameters);
        return { type: "list", objectType: objectType?.type, optional: objectType?.optional };
    }
    else if (isRealmTypeAlias(path, "Set") || isRealmTypeAlias(path, "Set", null)) {
        const objectType = getRealmTypeForTypeArgument(typeParameters);
        return { type: "set", objectType: objectType?.type, optional: objectType?.optional };
    }
    else if (isRealmTypeAlias(path, "Dictionary") || isRealmTypeAlias(path, "Dictionary", null)) {
        const objectType = getRealmTypeForTypeArgument(typeParameters);
        return { type: "dictionary", objectType: objectType?.type, optional: objectType?.optional };
    }
    else if (isRealmTypeAlias(path, "Mixed") || isRealmTypeAlias(path, "Mixed", null)) {
        return { type: "mixed" };
    }
    else if (isRealmTypeAlias(path, "LinkingObjects")) {
        const classPropertyNode = path.parentPath?.parentPath?.node;
        if (
        // Keep TS happy
        !core_1.types.isClassProperty(classPropertyNode) ||
            classPropertyNode.optional) {
            throw new Error(getLinkingObjectsError("Properties of type LinkingObjects cannot be optional"));
        }
        if (!typeParameters.isTSTypeParameterInstantiation()) {
            throw new Error(getLinkingObjectsError("Missing type arguments for LinkingObjects"));
        }
        const params = typeParameters.get("params");
        if (params.length !== 2) {
            throw new Error(getLinkingObjectsError("Incorrect number of type arguments for LinkingObjects"));
        }
        const objectTypeNode = params[0];
        if (!objectTypeNode.isTSTypeReference() || !core_1.types.isIdentifier(objectTypeNode.node.typeName)) {
            throw new Error(getLinkingObjectsError("First type argument for LinkingObjects should be a reference to the linked object's object type"));
        }
        const propertyNode = params[1];
        if (!propertyNode.isTSLiteralType() || !core_1.types.isStringLiteral(propertyNode.node.literal)) {
            throw new Error(getLinkingObjectsError("Second type argument for LinkingObjects should be the property name of the relationship it inverts"));
        }
        const objectType = objectTypeNode.node.typeName.name;
        const property = propertyNode.node.literal.value;
        return { type: "linkingObjects", objectType, property };
    }
    else if (typeName.isIdentifier()) {
        // TODO: Consider checking the scope to ensure it is a declared identifier
        return { type: typeName.node.name };
    }
}
function getRealmTypeForTSType(path) {
    if (path.isTSBooleanKeyword()) {
        return { type: "bool" };
    }
    else if (path.isTSStringKeyword()) {
        return { type: "string" };
    }
    else if (path.isTSNumberKeyword()) {
        return { type: DEFAULT_NUMERIC_TYPE };
    }
    else if (path.isTSTypeReference()) {
        return getRealmTypeForTSTypeReference(path);
    }
    else if (path.isTSUnionType()) {
        const types = path.get("types");
        if (types.length === 2) {
            const [first, last] = types;
            if (first.isTSUndefinedKeyword()) {
                const type = getRealmTypeForTSType(last);
                return type ? { ...type, optional: true } : undefined;
            }
            else if (last.isTSUndefinedKeyword()) {
                const type = getRealmTypeForTSType(first);
                return type ? { ...type, optional: true } : undefined;
            }
        }
    }
}
function inferTypeFromInitializer(path) {
    if (path.isBooleanLiteral()) {
        return { type: "bool" };
    }
    else if (path.isStringLiteral()) {
        return { type: "string" };
    }
    else if (path.isNumericLiteral()) {
        return { type: DEFAULT_NUMERIC_TYPE };
    }
    else if (path.isNewExpression()) {
        if ((0, import_checking_1.isPropertyImportedFromRealm)(path.get("callee"), "Decimal128")) {
            return { type: "decimal128" };
        }
        else if ((0, import_checking_1.isPropertyImportedFromRealm)(path.get("callee"), "ObjectId")) {
            return { type: "objectId" };
        }
        else if ((0, import_checking_1.isPropertyImportedFromRealm)(path.get("callee"), "UUID")) {
            return { type: "uuid" };
        }
        else if ((0, import_checking_1.isPropertyImportedFromRealm)(path.get("callee"), "Date") ||
            path.get("callee").isIdentifier({ name: "Date" })) {
            return { type: "date" };
        }
        else if ((0, import_checking_1.isPropertyImportedFromRealm)(path.get("callee"), "Data") ||
            path.get("callee").isIdentifier({ name: "ArrayBuffer" })) {
            return { type: "data" };
        }
    }
}
function getRealmTypeForClassProperty(path) {
    const typeAnnotationPath = path.get("typeAnnotation");
    const valuePath = path.get("value");
    if (typeAnnotationPath.isTSTypeAnnotation()) {
        const typePath = typeAnnotationPath.get("typeAnnotation");
        return getRealmTypeForTSType(typePath);
    }
    else if (valuePath.isExpression()) {
        return inferTypeFromInitializer(valuePath);
    }
}
function findDecoratorIdentifier(decoratorsPath, name) {
    return decoratorsPath.find((d) => d.node && core_1.types.isIdentifier(d.node.expression) && d.node.expression.name === name);
}
function findDecoratorCall(decoratorsPath, name) {
    const node = decoratorsPath.find((d) => d.node &&
        core_1.types.isCallExpression(d.node.expression) &&
        core_1.types.isIdentifier(d.node.expression.callee) &&
        d.node.expression.callee.name === name);
    if (!node)
        return null;
    return node.node.expression;
}
function visitRealmClassProperty(path) {
    const keyPath = path.get("key");
    const valuePath = path.get("value");
    const decoratorsPath = path.get("decorators");
    const index = Boolean(findDecoratorIdentifier(decoratorsPath, "index"));
    const mapToDecorator = findDecoratorCall(decoratorsPath, "mapTo");
    const mapTo = mapToDecorator && core_1.types.isStringLiteral(mapToDecorator.arguments[0])
        ? mapToDecorator.arguments[0].value
        : undefined;
    if (keyPath.isIdentifier()) {
        const name = keyPath.node.name;
        const realmType = getRealmTypeForClassProperty(path);
        if (realmType) {
            const properties = [
                core_1.types.objectProperty(core_1.types.identifier("type"), core_1.types.stringLiteral(realmType.type)),
            ];
            if (path.node.optional || realmType.optional) {
                properties.push(core_1.types.objectProperty(core_1.types.identifier("optional"), core_1.types.booleanLiteral(true)));
            }
            if (realmType.objectType) {
                properties.push(core_1.types.objectProperty(core_1.types.identifier("objectType"), core_1.types.stringLiteral(realmType.objectType)));
            }
            if (realmType.property) {
                properties.push(core_1.types.objectProperty(core_1.types.identifier("property"), core_1.types.stringLiteral(realmType.property)));
            }
            if (valuePath.isLiteral()) {
                properties.push(core_1.types.objectProperty(core_1.types.identifier("default"), valuePath.node));
            }
            else if (valuePath.isExpression()) {
                properties.push(core_1.types.objectProperty(core_1.types.identifier("default"), core_1.types.arrowFunctionExpression([], valuePath.node)));
            }
            if (index) {
                properties.push(core_1.types.objectProperty(core_1.types.identifier("indexed"), core_1.types.booleanLiteral(true)));
            }
            if (mapTo) {
                properties.push(core_1.types.objectProperty(core_1.types.identifier("mapTo"), core_1.types.stringLiteral(mapTo)));
            }
            return core_1.types.objectProperty(core_1.types.identifier(name), core_1.types.objectExpression(properties));
        }
        else {
            console.warn(`Unable to determine type of '${name}' property`);
        }
    }
}
const STATIC_STRING_PROPERTIES = ["name", "primaryKey"];
const STATIC_BOOLEAN_PROPERTIES = ["embedded", "asymmetric"];
function visitRealmClassStatic(path) {
    const keyPath = path.get("key");
    const valuePath = path.get("value");
    if (keyPath.isIdentifier()) {
        const name = keyPath.node.name;
        if (STATIC_STRING_PROPERTIES.includes(name) && core_1.types.isStringLiteral(valuePath.node)) {
            return core_1.types.objectProperty(core_1.types.identifier(name), core_1.types.stringLiteral(valuePath.node.value));
        }
        else if (STATIC_BOOLEAN_PROPERTIES.includes(name) && core_1.types.isBooleanLiteral(valuePath.node)) {
            return core_1.types.objectProperty(core_1.types.identifier(name), core_1.types.booleanLiteral(valuePath.node.value));
        }
    }
}
function visitRealmClass(path) {
    // path.addComment("leading", " Modified by @realm/babel-plugin", true);
    const className = path.node.id.name;
    // Transform properties to a static schema object
    const classProperties = path
        .get("body")
        .get("body")
        .filter((p) => p.isClassProperty());
    const schemaProperties = classProperties
        .filter((p) => !p.node.static)
        .map(visitRealmClassProperty)
        .filter((property) => property);
    const schemaStatics = classProperties
        .filter((p) => p.node.static)
        .map(visitRealmClassStatic)
        .filter((property) => property);
    const schema = core_1.types.objectExpression([
        core_1.types.objectProperty(core_1.types.identifier("name"), core_1.types.stringLiteral(className)),
        core_1.types.objectProperty(core_1.types.identifier("properties"), core_1.types.objectExpression(schemaProperties)),
        ...schemaStatics,
    ]);
    // Add the schema as a static
    const schemaStatic = core_1.types.classProperty(core_1.types.identifier("schema"), schema, undefined, undefined, undefined, true);
    path.get("body").pushContainer("body", schemaStatic);
}
/**
 * @param path The path of a class which might extend Realm's `Object`
 * @returns True iff the `path` points to a class which extends the `Object` which binds to an `Object` imported from the `"realm"` package.
 */
function isClassExtendingRealmObject(path) {
    // Determine if the super class is the "Object" class from the "realm" package
    const superClass = path.get("superClass");
    if (path.isClassDeclaration() && superClass.isExpression() && (0, import_checking_1.isPropertyImportedFromRealm)(superClass, "Object")) {
        // The class is extending "Realm.Object" from "realm"
        return true;
    }
    else if (superClass.isIdentifier({ name: "Object" }) && (0, import_checking_1.isImportedFromRealm)(superClass)) {
        // The class is extending "Object" from "realm"
        return true;
    }
    return false;
}
function default_1() {
    return {
        visitor: {
            ClassDeclaration(path) {
                if (isClassExtendingRealmObject(path)) {
                    visitRealmClass(path);
                }
            },
        },
    };
}
exports.default = default_1;
