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

import { TypeSpec } from "../spec/model";
import { parseTypeSpec } from "../spec/type-transformer";

const TESTS: [string, TypeSpec][] = [
  [
    "foo",
    {
      kind: "qualified-name",
      names: ["foo"],
      isConst: false,
      isPointer: false,
      isReference: false,
      isRvalueReference: false,
    },
  ],
  [
    "foo::bar",
    {
      kind: "qualified-name",
      names: ["foo", "bar"],
      isConst: false,
      isPointer: false,
      isReference: false,
      isRvalueReference: false,
    },
  ],
  [
    "foo::bar<baz, qux::fred>",
    {
      kind: "template-instance",
      names: ["foo", "bar"],
      templateArguments: [
        {
          kind: "qualified-name",
          names: ["baz"],
          isConst: false,
          isPointer: false,
          isReference: false,
          isRvalueReference: false,
        },
        {
          kind: "qualified-name",
          names: ["qux", "fred"],
          isConst: false,
          isPointer: false,
          isReference: false,
          isRvalueReference: false,
        },
      ],
      isConst: false,
      isPointer: false,
      isReference: false,
      isRvalueReference: false,
    },
  ],
  [
    "()",
    {
      kind: "function",
      arguments: [],
      return: {
        kind: "qualified-name",
        names: ["void"],
        isConst: false,
        isPointer: false,
        isReference: false,
        isRvalueReference: false,
      },
      isConst: false,
      isNoExcept: false,
    },
  ],
  [
    "(n: int)",
    {
      kind: "function",
      arguments: [
        {
          name: "n",
          type: {
            kind: "qualified-name",
            names: ["int"],
            isConst: false,
            isPointer: false,
            isReference: false,
            isRvalueReference: false,
          },
        },
      ],
      return: {
        kind: "qualified-name",
        names: ["void"],
        isConst: false,
        isPointer: false,
        isReference: false,
        isRvalueReference: false,
      },
      isConst: false,
      isNoExcept: false,
    },
  ],
  [
    "(a: (b: c) -> d) -> e",
    {
      kind: "function",
      arguments: [
        {
          name: "a",
          type: {
            kind: "function",
            arguments: [
              {
                name: "b",
                type: {
                  kind: "qualified-name",
                  names: ["c"],
                  isConst: false,
                  isPointer: false,
                  isReference: false,
                  isRvalueReference: false,
                },
              },
            ],
            isConst: false,
            isNoExcept: false,
            return: {
              kind: "qualified-name",
              names: ["d"],
              isConst: false,
              isPointer: false,
              isReference: false,
              isRvalueReference: false,
            },
          },
        },
      ],
      return: {
        kind: "qualified-name",
        names: ["e"],
        isConst: false,
        isPointer: false,
        isReference: false,
        isRvalueReference: false,
      },
      isConst: false,
      isNoExcept: false,
    },
  ],
  [
    "() const noexcept -> void",
    {
      kind: "function",
      arguments: [],
      return: {
        kind: "qualified-name",
        names: ["void"],
        isConst: false,
        isPointer: false,
        isReference: false,
        isRvalueReference: false,
      },
      isConst: true,
      isNoExcept: true,
    },
  ],
  [
    "foo const*&&",
    {
      kind: "qualified-name",
      names: ["foo"],
      isConst: true,
      isPointer: true,
      isReference: false,
      isRvalueReference: true,
    },
  ],
  [
    "const int&",
    {
      kind: "qualified-name",
      names: ["int"],
      isConst: true,
      isPointer: false,
      isReference: true,
      isRvalueReference: false,
    },
  ],
];

describe("type vistor", () => {
  for (const [text, expectedResult] of TESTS) {
    it(`parses "${text}"`, () => {
      const result = parseTypeSpec(text);
      expect(result).deep.equals(expectedResult);
    });
  }
});
