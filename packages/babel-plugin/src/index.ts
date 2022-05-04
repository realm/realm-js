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

type RealmType = { type: string; objectType?: string; default?: types.Expression };

// This could be "int" or "double", but we default to "double" because this is how a JS Number is represented internally
const DEFAULT_NUMERIC_TYPE = "double";

function getRealmType(path: NodePath<types.ClassProperty>): RealmType | undefined {
  const typeAnnotationPath = path.get("typeAnnotation");
  if (typeAnnotationPath.isTSTypeAnnotation()) {
    const typeAnnotation = typeAnnotationPath.get("typeAnnotation");
    if (typeAnnotation.isTSBooleanKeyword()) {
      return { type: "bool" };
    } else if (typeAnnotation.isTSStringKeyword()) {
      return { type: "string" };
    } else if (typeAnnotation.isTSNumberKeyword()) {
      return { type: DEFAULT_NUMERIC_TYPE };
    } else if (typeAnnotation.isTSTypeReference()) {
      const typeName = typeAnnotation.get("typeName");
      const typeParameters = typeAnnotation.get("typeParameters");
      if (typeName.isIdentifier()) {
        return { type: typeName.node.name };
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
      }
    }
  } else {
    const valuePath = path.get("value");
    if (valuePath.isStringLiteral()) {
      return { type: "string", default: valuePath.node };
    } else if (valuePath.isNumericLiteral()) {
      return { type: DEFAULT_NUMERIC_TYPE, default: valuePath.node };
    }
  }
}

function visitRealmClassProperty(path: NodePath<types.ClassProperty>) {
  const keyPath = path.get("key");
  if (keyPath.isIdentifier()) {
    const name = keyPath.node.name;
    const realmType = getRealmType(path);
    if (realmType && typeof name === "string") {
      const properties: types.ObjectProperty[] = [
        types.objectProperty(types.identifier("type"), types.stringLiteral(realmType.type)),
      ];
      if (path.node.optional) {
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

type AnyImportSpecifier = types.ImportSpecifier | types.ImportDefaultSpecifier | types.ImportNamespaceSpecifier;

function isImportedFromRealm(path: NodePath<AnyImportSpecifier>) {
  return path.parentPath.isImportDeclaration() && path.parentPath.get("source").isStringLiteral({ value: "realm" });
}

/**
 * @param path The path of a class which might extend Realm's `Object`
 * @returns True iff the `path` points to a class which extends the `Object` which binds to an `Object` imported from the `"realm"` package.
 */
function extendsRealmObject(path: NodePath<types.ClassDeclaration>) {
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

export default function (): PluginObj<unknown> {
  return {
    visitor: {
      ClassDeclaration(path) {
        if (extendsRealmObject(path)) {
          visitRealmClass(path);
        }
      },
    },
  };
}
