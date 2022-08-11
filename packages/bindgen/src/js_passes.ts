import {Field, Method, NamedType, Property} from "./bound-model"
import { camelCase, pascalCase } from "change-case";

// Any js-specific data needed on the bound model will live in this file.

declare module "./bound-model" {
  interface Property {
    readonly jsName: string
  }
  interface Method {
    readonly jsName: string
  }
  interface NamedType {
    readonly jsName: string
  }
  interface Field {
    readonly jsName: string
  }
}

Object.defineProperty(Property.prototype, 'jsName', {
  get: function(this: Property) {
    let name = this.name;
    if (name.startsWith('get_'))
      name = name.substring('get_'.length)
    return camelCase(name);
  }
});

Object.defineProperty(Method.prototype, 'jsName', {
  get: function(this: Method) {
    return camelCase(this.unique_name);
  }
});

Object.defineProperty(Field.prototype, 'jsName', {
  get: function(this: Field) {
    return camelCase(this.name);
  }
});

Object.defineProperty(NamedType.prototype, 'jsName', {
  get: function(this: NamedType) {
    return pascalCase(this.name);
  }
});
