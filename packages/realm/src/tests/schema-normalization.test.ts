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

import { expect } from "chai";

import { extractGeneric, normalizeObjectSchema, normalizePropertySchema } from "../schema/normalize";

describe("normalizePropertySchema", () => {
  it("transforms a string declaring a string", () => {
    const result = normalizePropertySchema("prop", "string");
    expect(result.name).equals("prop");
    expect(result.type).equals("string");
  });

  it("transforms a string declaring a list of strings", () => {
    const result = normalizePropertySchema("prop", "string[]");
    expect(result.name).equals("prop");
    expect(result.type).equals("list");
    expect(result.objectType).equals("string");
    expect(result.optional).equals(false);
  });

  it("transforms a string declaring a list of optional strings", () => {
    const result = normalizePropertySchema("prop", "string?[]");
    expect(result.name).equals("prop");
    expect(result.type).equals("list");
    expect(result.objectType).equals("string");
    expect(result.optional).equals(true);
  });

  it("transforms a string declaring a list of class name", () => {
    const result = normalizePropertySchema("prop", "Person[]");
    expect(result.name).equals("prop");
    expect(result.type).equals("list");
    expect(result.objectType).equals("Person");
    expect(result.optional).equals(false); // Lists of objects may never be optional
  });
});

describe("extractGeneric", () => {
  it("pass through non-generic types", () => {
    const { typeBase, typeArgument } = extractGeneric("test");
    expect(typeBase).equals("test");
    expect(typeArgument).is.undefined;
  });

  it("extracts a generic type", () => {
    const { typeBase, typeArgument } = extractGeneric("test<arg>");
    expect(typeBase).equals("test");
    expect(typeArgument).equals("arg");
  });
});
