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

import { types, NodePath, PluginObj, PluginPass } from "@babel/core";

import { isPropertyImportedFromRealm, isImportedFromRealm } from "./import-checking";

type RealmType = {
  type: string;
  objectType?: string;
  default?: types.Expression;
  optional?: boolean;
  property?: string;
};

// This could be "int" or "double", but we default to "double" because this is how a JS Number is represented internally
const DEFAULT_NUMERIC_TYPE = "double";
const REALM_NAMED_EXPORT = "Realm";
const TYPES_NAMED_EXPORT = "Types";
const BSON_NAMED_EXPORT = "BSON";

function isRealmTypeAlias(
  path: NodePath<types.TSEntityName | types.TSTypeReference>,
  name: string,
  namespace: string | null = TYPES_NAMED_EXPORT,
): boolean {
  if (path.isTSTypeReference()) {
    return isRealmTypeAlias(path.get("typeName"), name, namespace);
  } else if (path.isTSQualifiedName() && path.get("right").isIdentifier({ name })) {
    const left = path.get("left");
    if (namespace === null && left.isIdentifier({ name: REALM_NAMED_EXPORT })) {
      // Realm.{{name}}
      return isImportedFromRealm(left);
    } else if (left.isIdentifier({ name: namespace })) {
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
  } else if (path.isIdentifier({ name })) {
    return isImportedFromRealm(path);
  }

  return false;
}

function getRealmTypeForTypeArgument(
  typeParameters: NodePath<types.TSTypeParameterInstantiation | null | undefined>,
): RealmType | undefined {
  if (typeParameters.isTSTypeParameterInstantiation()) {
    const objectTypePath = typeParameters.get("params")[0];
    return getRealmTypeForTSType(objectTypePath);
  }
}

function getLinkingObjectsError(message: string) {
  return message + '. Correct syntax is: `fieldName!: Realm.LinkingObjects<LinkedObjectType, "invertedPropertyName">`';
}

function getRealmTypeForTSTypeReference(path: NodePath<types.TSTypeReference>): RealmType | undefined {
  const typeName = path.get("typeName");
  const typeParameters = path.get("typeParameters");
  if (isRealmTypeAlias(path, "Bool")) {
    return { type: "bool" };
  } else if (isRealmTypeAlias(path, "String")) {
    return { type: "string" };
  } else if (isRealmTypeAlias(path, "Int")) {
    return { type: "int" };
  } else if (isRealmTypeAlias(path, "Float")) {
    return { type: "float" };
  } else if (isRealmTypeAlias(path, "Double")) {
    return { type: "double" };
  } else if (isRealmTypeAlias(path, "Decimal128") || isRealmTypeAlias(path, "Decimal128", BSON_NAMED_EXPORT)) {
    return { type: "decimal128" };
  } else if (isRealmTypeAlias(path, "ObjectId") || isRealmTypeAlias(path, "ObjectId", BSON_NAMED_EXPORT)) {
    return { type: "objectId" };
  } else if (isRealmTypeAlias(path, "UUID") || isRealmTypeAlias(path, "UUID", BSON_NAMED_EXPORT)) {
    return { type: "uuid" };
  } else if (isRealmTypeAlias(path, "Date") || typeName.isIdentifier({ name: "Date" })) {
    return { type: "date" };
  } else if (isRealmTypeAlias(path, "Data") || typeName.isIdentifier({ name: "ArrayBuffer" })) {
    return { type: "data" };
  } else if (isRealmTypeAlias(path, "List") || isRealmTypeAlias(path, "List", null)) {
    const argumentType = getRealmTypeForTypeArgument(typeParameters);
    const objectType = argumentType?.type === "object" ? argumentType.objectType : argumentType?.type;
    return { type: "list", objectType: objectType, optional: argumentType?.optional };
  } else if (isRealmTypeAlias(path, "Set") || isRealmTypeAlias(path, "Set", null)) {
    const argumentType = getRealmTypeForTypeArgument(typeParameters);
    const objectType = argumentType?.type === "object" ? argumentType.objectType : argumentType?.type;
    return { type: "set", objectType: objectType, optional: argumentType?.optional };
  } else if (isRealmTypeAlias(path, "Dictionary") || isRealmTypeAlias(path, "Dictionary", null)) {
    const argumentType = getRealmTypeForTypeArgument(typeParameters);
    const objectType = argumentType?.type === "object" ? argumentType.objectType : argumentType?.type;
    return { type: "dictionary", objectType: objectType, optional: argumentType?.optional };
  } else if (isRealmTypeAlias(path, "Mixed") || isRealmTypeAlias(path, "Mixed", null)) {
    return { type: "mixed" };
  } else if (isRealmTypeAlias(path, "LinkingObjects")) {
    const classPropertyNode = path.parentPath?.parentPath?.node;
    if (
      // Keep TS happy
      !types.isClassProperty(classPropertyNode) ||
      classPropertyNode.optional
    ) {
      throw path.buildCodeFrameError(getLinkingObjectsError("Properties of type LinkingObjects cannot be optional"));
    }

    if (!typeParameters.isTSTypeParameterInstantiation()) {
      throw path.buildCodeFrameError(getLinkingObjectsError("Missing type arguments for LinkingObjects"));
    }

    const params = typeParameters.get("params");

    if (params.length !== 2) {
      throw path.buildCodeFrameError(getLinkingObjectsError("Incorrect number of type arguments for LinkingObjects"));
    }

    const objectTypeNode = params[0];

    if (!objectTypeNode.isTSTypeReference() || !types.isIdentifier(objectTypeNode.node.typeName)) {
      throw path.buildCodeFrameError(
        getLinkingObjectsError(
          "First type argument for LinkingObjects should be a reference to the linked object's object type",
        ),
      );
    }

    const propertyNode = params[1];

    if (!propertyNode.isTSLiteralType() || !types.isStringLiteral(propertyNode.node.literal)) {
      throw path.buildCodeFrameError(
        getLinkingObjectsError(
          "Second type argument for LinkingObjects should be the property name of the relationship it inverts",
        ),
      );
    }

    const objectType = objectTypeNode.node.typeName.name;
    const property = propertyNode.node.literal.value;

    return { type: "linkingObjects", objectType, property };
  } else if (typeName.isIdentifier()) {
    // TODO: Consider checking the scope to ensure it is a declared identifier
    return { type: "object", objectType: typeName.node.name };
  }
}

function getRealmTypeForTSType(path: NodePath<types.TSType>): RealmType | undefined {
  if (path.isTSBooleanKeyword()) {
    return { type: "bool" };
  } else if (path.isTSStringKeyword()) {
    return { type: "string" };
  } else if (path.isTSNumberKeyword()) {
    return { type: DEFAULT_NUMERIC_TYPE };
  } else if (path.isTSTypeReference()) {
    return getRealmTypeForTSTypeReference(path);
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
    } else if (isPropertyImportedFromRealm(path.get("callee"), "ObjectId")) {
      return { type: "objectId" };
    } else if (isPropertyImportedFromRealm(path.get("callee"), "UUID")) {
      return { type: "uuid" };
    } else if (
      isPropertyImportedFromRealm(path.get("callee"), "Date") ||
      path.get("callee").isIdentifier({ name: "Date" })
    ) {
      return { type: "date" };
    } else if (
      isPropertyImportedFromRealm(path.get("callee"), "Data") ||
      path.get("callee").isIdentifier({ name: "ArrayBuffer" })
    ) {
      return { type: "data" };
    }
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

function isRealmDecoratorWithName(path: any, name: string): boolean {
  return (
    (types.isIdentifier(path) && path.name === name) ||
    (types.isMemberExpression(path) &&
      types.isIdentifier(path.object) &&
      path.object.name === "Realm" &&
      types.isIdentifier(path.property) &&
      path.property.name === name)
  );
}

function findDecoratorIdentifier(
  decoratorsPath: NodePath<types.Decorator>[],
  name: string,
): NodePath<types.Decorator> | undefined {
  return decoratorsPath.find(
    (d) =>
      d.node &&
      isRealmDecoratorWithName(d.node.expression, name) &&
      // ((types.isIdentifier(d.node.expression) && d.node.expression.name === name) ||
      //   (types.isMemberExpression(d.node.expression) &&
      //     types.isIdentifier(d.node.expression.object) &&
      //     d.node.expression.object.name === "Realm" &&
      //     types.isIdentifier(d.node.expression.property) &&
      //     d.node.expression.property.name === name)) &&
      isImportedFromRealm(d),
  );
}

function findDecoratorCall(
  decoratorsPath: NodePath<types.Decorator>[],
  name: string,
): { decoratorNode: NodePath<types.Decorator>; callExpression: types.CallExpression } | undefined {
  const node = decoratorsPath.find(
    (d) =>
      d.node &&
      types.isCallExpression(d.node.expression) &&
      isRealmDecoratorWithName(d.node.expression.callee, name) &&
      // types.isIdentifier(d.node.expression.callee) &&
      // d.node.expression.callee.name === name &&
      isImportedFromRealm(d),
  );

  if (!node) return undefined;

  // Return both the node and the callExpression from here to avoid
  // additional type checking requirements at the call site
  return { decoratorNode: node, callExpression: node.node.expression as types.CallExpression };
}

function visitRealmClassProperty(path: NodePath<types.ClassProperty>) {
  const keyPath = path.get("key");
  const valuePath = path.get("value");
  // TODO: Avoid this type assertion
  const decoratorsPath = path.get("decorators") as NodePath<types.Decorator>[];

  const indexDecorator = findDecoratorIdentifier(decoratorsPath, "index");
  if (indexDecorator) {
    indexDecorator;
  }
  const index = Boolean(indexDecorator);

  const mapToDecorator = findDecoratorCall(decoratorsPath, "mapTo");
  const mapTo =
    mapToDecorator && types.isStringLiteral(mapToDecorator.callExpression.arguments[0])
      ? mapToDecorator.callExpression.arguments[0].value
      : undefined;

  // Remove the decorators from the final source as they are only for schema annotation purposes.
  // Decorator implementations will throw to prevent usage outside of the plugin.
  if (indexDecorator) indexDecorator.remove();
  if (mapToDecorator) mapToDecorator.decoratorNode.remove();

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

      if (realmType.property) {
        properties.push(types.objectProperty(types.identifier("property"), types.stringLiteral(realmType.property)));
      }

      if (valuePath.isLiteral()) {
        properties.push(types.objectProperty(types.identifier("default"), valuePath.node));
      } else if (valuePath.isExpression()) {
        properties.push(
          types.objectProperty(types.identifier("default"), types.arrowFunctionExpression([], valuePath.node)),
        );
        valuePath.remove();
      }

      if (index) {
        properties.push(types.objectProperty(types.identifier("indexed"), types.booleanLiteral(true)));
      }

      if (mapTo) {
        properties.push(types.objectProperty(types.identifier("mapTo"), types.stringLiteral(mapTo)));
      }

      return types.objectProperty(types.identifier(name), types.objectExpression(properties));
    } else {
      console.warn(`Unable to determine type of '${name}' property`);
    }
  }
}

const STATIC_STRING_PROPERTIES: string[] = ["name", "primaryKey"];
const STATIC_BOOLEAN_PROPERTIES: string[] = ["embedded", "asymmetric"];

function visitRealmClassStatic(path: NodePath<types.ClassProperty>) {
  const keyPath = path.get("key");
  const valuePath = path.get("value");

  if (keyPath.isIdentifier()) {
    const name = keyPath.node.name;

    if (STATIC_STRING_PROPERTIES.includes(name) && types.isStringLiteral(valuePath.node)) {
      return types.objectProperty(types.identifier(name), types.stringLiteral(valuePath.node.value));
    } else if (STATIC_BOOLEAN_PROPERTIES.includes(name) && types.isBooleanLiteral(valuePath.node)) {
      return types.objectProperty(types.identifier(name), types.booleanLiteral(valuePath.node.value));
    }
  }
}

function visitRealmClass(path: NodePath<types.ClassDeclaration>) {
  path.addComment("leading", " Modified by @realm/babel-plugin", true);
  const className = path.node.id.name;
  // Transform properties to a static schema object
  const classProperties = path
    .get("body")
    .get("body")
    .filter((p) => p.isClassProperty()) as NodePath<types.ClassProperty>[];

  if (classProperties.find((p) => p.node.static && types.isIdentifier(p.node.key) && p.node.key.name === "schema")) {
    throw new Error(
      "Classes extending Realm.Object cannot define their own `schema` static, all properties must be defined using TypeScript syntax",
    );
  }

  const schemaProperties = classProperties
    .filter((p) => !p.node.static)
    .map(visitRealmClassProperty)
    .filter((property) => property) as types.ObjectProperty[];

  const schemaStatics = classProperties
    .filter((p) => p.node.static)
    .map(visitRealmClassStatic)
    .filter((property) => property) as types.ObjectProperty[];

  const schema = types.objectExpression([
    types.objectProperty(types.identifier("name"), types.stringLiteral(className)),
    types.objectProperty(types.identifier("properties"), types.objectExpression(schemaProperties)),
    ...schemaStatics,
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

// Thanks to https://twitter.com/NicoloRibaudo/status/1572482164230348800
function isTypescriptFile(filename: string | undefined) {
  if (!filename) return false;

  const extension = filename.split(".").pop();
  return extension && ["ts", "cts", "mts", "tsx"].includes(extension);
}

export default function (): PluginObj<PluginPass> {
  return {
    visitor: {
      ClassDeclaration(path) {
        if (isClassExtendingRealmObject(path)) {
          if (!isTypescriptFile(this.filename)) {
            console.warn(
              `@realm/babel-plugin can only be used with Typescript source files. Ignoring ${this.filename}`,
            );
          } else {
            visitRealmClass(path);
          }
        }
      },
    },
  };
}
