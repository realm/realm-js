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

import type * as Babel from "@babel/core";
import { PluginObj } from "@babel/core";

type RealmType = { type: string; objectType?: string; default?: Babel.types.Expression };

// This could be "int" or "double", but we default to "double" because this is how a JS Number is represented internally
const DEFAULT_NUMERIC_TYPE = "double";

function getRealmType(babel: typeof Babel, classProperty: Babel.types.ClassProperty): RealmType | undefined {
  const { types } = babel;
  if (types.isTSTypeAnnotation(classProperty.typeAnnotation)) {
    const typeAnnotation = classProperty.typeAnnotation.typeAnnotation;
    if (typeAnnotation.type === "TSBooleanKeyword") {
      return { type: "bool" };
    } else if (typeAnnotation.type === "TSStringKeyword") {
      return { type: "string" };
    } else if (typeAnnotation.type === "TSNumberKeyword") {
      return { type: DEFAULT_NUMERIC_TYPE };
    } else if (typeAnnotation.type === "TSTypeReference") {
      const { typeName, typeParameters } = typeAnnotation;
      if (types.isIdentifier(typeName)) {
        return { type: typeName.name };
      } else if (
        types.isIdentifier(typeName.left, { name: "Realm" }) &&
        types.isIdentifier(typeName.right, { name: "List" }) &&
        typeParameters
      ) {
        const objectType = typeParameters.params[0];
        if (objectType && types.isTSTypeReference(objectType) && types.isIdentifier(objectType.typeName)) {
          return { type: "list", objectType: objectType.typeName.name };
        }
      }
    }
  } else if (types.isStringLiteral(classProperty.value)) {
    return { type: "string", default: classProperty.value };
  } else if (types.isNumericLiteral(classProperty.value)) {
    return { type: DEFAULT_NUMERIC_TYPE, default: classProperty.value };
  }
}

function visitRealmClassProperty(babel: typeof Babel, classProperty: Babel.types.ClassProperty) {
  const { types } = babel;
  if (types.isIdentifier(classProperty.key)) {
    const name = classProperty.key.name;
    const realmType = getRealmType(babel, classProperty);
    if (realmType) {
      const properties: Babel.types.ObjectProperty[] = [
        types.objectProperty(types.identifier("type"), types.stringLiteral(realmType.type)),
      ];
      if (classProperty.optional) {
        properties.push(types.objectProperty(types.identifier("optional"), types.booleanLiteral(true)));
      }
      if (realmType.objectType) {
        properties.push(
          types.objectProperty(types.identifier("objectType"), types.stringLiteral(realmType.objectType)),
        );
      }
      if (realmType.default) {
        properties.push(types.objectProperty(types.identifier("default"), realmType.default));
      }
      return types.objectProperty(types.identifier(name), types.objectExpression(properties));
    } else {
      console.warn(`Unable to determine type of '${name}' property`);
    }
  }
}

function visitRealmClass(babel: typeof Babel, path: Babel.NodePath<Babel.types.ClassDeclaration>) {
  const { types } = babel;
  path.addComment("leading", " Modified by @realm/babel-plugin", true);

  const className = path.node.id.name;
  // Transform properties to a static schema object
  const schemaProperties = path.node.body.body
    .map((child) => {
      if (types.isClassProperty(child)) {
        return visitRealmClassProperty(babel, child);
      }
    })
    .filter((obj) => obj) as Babel.types.ObjectProperty[]; // Remove any unmapped properties

  const schema = types.objectExpression([
    types.objectProperty(types.identifier("name"), types.stringLiteral(className)),
    types.objectProperty(types.identifier("properties"), types.objectExpression(schemaProperties)),
  ]);

  // Add the schema as a static
  const schemaStatic = types.classProperty(types.identifier("schema"), schema, undefined, undefined, undefined, true);
  path.get("body").pushContainer("body", schemaStatic);
}

type AnyImportSpecifier =
  | Babel.types.ImportSpecifier
  | Babel.types.ImportDefaultSpecifier
  | Babel.types.ImportNamespaceSpecifier;

function isImportedFromRealm(path: Babel.NodePath<AnyImportSpecifier>) {
  return path.parentPath.isImportDeclaration() && path.parentPath.get("source").isStringLiteral({ value: "realm" });
}

/**
 * @param path The path of a class which might extend Realm's `Object`
 * @returns True iff the `path` points to a class which extends the `Object` which binds to an `Object` imported from the `"realm"` package.
 */
function extendsRealmObject(path: Babel.NodePath<Babel.types.ClassDeclaration>) {
  // Determine if the super class is the "Object" class from the "realm" package
  const superClass = path.get("superClass");
  if (
    path.isClassDeclaration() &&
    superClass.isMemberExpression() &&
    superClass.get("object").isIdentifier({ name: "Realm" }) &&
    superClass.get("property").isIdentifier({ name: "Object" })
  ) {
    // The class is extending "Realm.Object"
    // Determine if this is the "Realm" exported by the "realm" package
    const realmBinding = path.scope.getBinding("Realm");
    return (
      realmBinding &&
      (realmBinding.path.isImportDefaultSpecifier() || realmBinding.path.isImportNamespaceSpecifier()) &&
      isImportedFromRealm(realmBinding.path)
    );
  } else if (superClass.isIdentifier({ name: "Object" })) {
    // Determine if this is the "Object" exported by the "realm" package
    const objectBinding = path.scope.getBinding("Object");
    return objectBinding && objectBinding.path.isImportSpecifier() && isImportedFromRealm(objectBinding.path);
  }
  return false;
}

export default function (babel: typeof Babel): PluginObj<unknown> {
  return {
    visitor: {
      ClassDeclaration(path) {
        if (extendsRealmObject(path)) {
          visitRealmClass(babel, path);
        }
      },
    },
  };
}
