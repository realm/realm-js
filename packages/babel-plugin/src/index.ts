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

import { types, NodePath, PluginObj } from "@babel/core";

import { isPropertyImportedFromRealm, isImportedFromRealm } from "./import-checking";

type RealmType = { type: string; objectType?: string; default?: types.Expression; optional?: boolean };

// This could be "int" or "double", but we default to "double" because this is how a JS Number is represented internally
const DEFAULT_NUMERIC_TYPE = "double";
const REALM_NAMED_EXPORT = "Realm";
const TYPES_NAMED_EXPORT = "Types";
const BSON_NAMED_EXPORT = "BSON";

function isRealmTypeAlias(
  path: NodePath<types.TSEntityName>,
  name: string,
  namespace: string = TYPES_NAMED_EXPORT,
): boolean {
  if (path.isTSQualifiedName() && path.get("right").isIdentifier({ name })) {
    const left = path.get("left");
    if (left.isIdentifier({ name: namespace })) {
      // {{namespace}}.{{name}}
      return isImportedFromRealm(left);
    } else if (path.get("left").isTSQualifiedName()) {
      // Realm.{{namespace}}.{{name}}
      return (
        left.isTSQualifiedName() &&
        left.get("left").isIdentifier({ name: REALM_NAMED_EXPORT }) &&
        left.get("right").isIdentifier({ name: namespace }) &&
        isImportedFromRealm(path.get("left"))
      );
    }
  } else if (path.isIdentifier()) {
    return isImportedFromRealm(path);
  }
  return false;
}

function getRealmTypeForTSType(path: NodePath<types.TSType>): RealmType | undefined {
  if (path.isTSBooleanKeyword()) {
    return { type: "bool" };
  } else if (path.isTSStringKeyword()) {
    return { type: "string" };
  } else if (path.isTSNumberKeyword()) {
    return { type: DEFAULT_NUMERIC_TYPE };
  } else if (path.isTSTypeReference()) {
    const typeName = path.get("typeName");
    const typeParameters = path.get("typeParameters");
    if (typeName.isTSQualifiedName() && isRealmTypeAlias(typeName, "Bool")) {
      return { type: "bool" };
    } else if (typeName.isTSQualifiedName() && isRealmTypeAlias(typeName, "String")) {
      return { type: "string" };
    } else if (typeName.isTSQualifiedName() && isRealmTypeAlias(typeName, "Int")) {
      return { type: "int" };
    } else if (typeName.isTSQualifiedName() && isRealmTypeAlias(typeName, "Float")) {
      return { type: "float" };
    } else if (typeName.isTSQualifiedName() && isRealmTypeAlias(typeName, "Double")) {
      return { type: "double" };
    } else if (
      typeName.isTSQualifiedName() &&
      (isRealmTypeAlias(typeName, "Decimal128") || isRealmTypeAlias(typeName, "Decimal128", BSON_NAMED_EXPORT))
    ) {
      return { type: "decimal128" };
    } else if (isRealmTypeAlias(typeName, "List") && typeParameters.isTSTypeParameterInstantiation()) {
      const objectType = typeParameters.get("params")[0];
      if (objectType && objectType.isTSTypeReference()) {
        const typeName = objectType.get("typeName");
        if (typeName.isIdentifier()) {
          return { type: "list", objectType: typeName.node.name };
        }
      }
    } else if (
      typeName.isTSQualifiedName() &&
      typeName.get("left").isIdentifier({ name: "Realm" }) &&
      typeName.get("right").isIdentifier({ name: "List" }) &&
      typeParameters.isTSTypeParameterInstantiation()
    ) {
      const objectType = typeParameters.node.params[0];
      if (objectType && types.isTSTypeReference(objectType) && types.isIdentifier(objectType.typeName)) {
        return { type: "list", objectType: objectType.typeName.name };
      }
    } else if (typeName.isIdentifier()) {
      return { type: typeName.node.name };
    }
  } else if (path.isTSUnionType()) {
    const types = path.get("types");
    if (types.length === 2) {
      const [first, last] = types;
      if (first.isTSUndefinedKeyword()) {
        const type = getRealmTypeForTSType(last);
        return type ? { ...type, optional: true } : undefined;
      } else if (last.isTSUndefinedKeyword()) {
        const type = getRealmTypeForTSType(first);
        return type ? { ...type, optional: true } : undefined;
      }
    }
  }
}

function inferTypeFromInitializer(path: NodePath<types.Expression>): RealmType | undefined {
  if (path.isBooleanLiteral()) {
    return { type: "bool" };
  } else if (path.isStringLiteral()) {
    return { type: "string" };
  } else if (path.isNumericLiteral()) {
    return { type: DEFAULT_NUMERIC_TYPE };
  } else if (path.isNewExpression()) {
    if (isPropertyImportedFromRealm(path.get("callee"), "Decimal128")) {
      return { type: "decimal128" };
    }
    console.log(path.node.callee);
  }
}

function getRealmTypeForClassProperty(path: NodePath<types.ClassProperty>): RealmType | undefined {
  const typeAnnotationPath = path.get("typeAnnotation");
  const valuePath = path.get("value");
  if (typeAnnotationPath.isTSTypeAnnotation()) {
    const typePath = typeAnnotationPath.get("typeAnnotation");
    return getRealmTypeForTSType(typePath);
  } else if (valuePath.isExpression()) {
    return inferTypeFromInitializer(valuePath);
  }
}

function visitRealmClassProperty(path: NodePath<types.ClassProperty>) {
  const keyPath = path.get("key");
  const valuePath = path.get("value");
  if (keyPath.isIdentifier()) {
    const name = keyPath.node.name;
    const realmType = getRealmTypeForClassProperty(path);
    if (realmType) {
      const properties: types.ObjectProperty[] = [
        types.objectProperty(types.identifier("type"), types.stringLiteral(realmType.type)),
      ];
      if (path.node.optional || realmType.optional) {
        properties.push(types.objectProperty(types.identifier("optional"), types.booleanLiteral(true)));
      }
      if (realmType.objectType) {
        properties.push(
          types.objectProperty(types.identifier("objectType"), types.stringLiteral(realmType.objectType)),
        );
      }
      if (valuePath.isLiteral()) {
        properties.push(types.objectProperty(types.identifier("default"), valuePath.node));
      } else if (valuePath.isExpression()) {
        properties.push(
          types.objectProperty(types.identifier("default"), types.arrowFunctionExpression([], valuePath.node)),
        );
      }
      return types.objectProperty(types.identifier(name), types.objectExpression(properties));
    } else {
      console.warn(`Unable to determine type of '${name}' property`);
    }
  }
}

function visitRealmClass(path: NodePath<types.ClassDeclaration>) {
  path.addComment("leading", " Modified by @realm/babel-plugin", true);
  const className = path.node.id.name;
  // Transform properties to a static schema object
  const schemaProperties: types.ObjectProperty[] = [];
  path.traverse({
    ClassProperty(propertyPath) {
      const propertySchema = visitRealmClassProperty(propertyPath);
      if (propertySchema) {
        schemaProperties.push(propertySchema);
      }
    },
  });

  const schema = types.objectExpression([
    types.objectProperty(types.identifier("name"), types.stringLiteral(className)),
    types.objectProperty(types.identifier("properties"), types.objectExpression(schemaProperties)),
  ]);

  // Add the schema as a static
  const schemaStatic = types.classProperty(types.identifier("schema"), schema, undefined, undefined, undefined, true);
  path.get("body").pushContainer("body", schemaStatic);
}

/**
 * @param path The path of a class which might extend Realm's `Object`
 * @returns True iff the `path` points to a class which extends the `Object` which binds to an `Object` imported from the `"realm"` package.
 */
function isClassExtendingRealmObject(path: NodePath<types.ClassDeclaration>) {
  // Determine if the super class is the "Object" class from the "realm" package
  const superClass = path.get("superClass");
  if (path.isClassDeclaration() && superClass.isExpression() && isPropertyImportedFromRealm(superClass, "Object")) {
    // The class is extending "Realm.Object" from "realm"
    return true;
  } else if (superClass.isIdentifier({ name: "Object" }) && isImportedFromRealm(superClass)) {
    // The class is extending "Object" from "realm"
    return true;
  }
  return false;
}

export default function (): PluginObj<unknown> {
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
