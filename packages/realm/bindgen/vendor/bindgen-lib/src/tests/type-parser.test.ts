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
import { parseTypeSpec } from "../spec/type-parser";

const TESTS: [string, TypeSpec][] = [
  [
    "foo",
    {
      kind: "type-name",
      name: "foo",
    },
  ],
  [
    "foo::bar",
    {
      kind: "type-name",
      name: "foo::bar",
    },
  ],
  [
    "foo::bar<baz, qux::fred>",
    {
      kind: "template-instance",
      name: "foo::bar",
      templateArguments: [
        {
          kind: "type-name",
          name: "baz",
        },
        {
          kind: "type-name",
          name: "qux::fred",
        },
      ],
    },
  ],
  [
    "()",
    {
      kind: "function",
      args: [],
      ret: {
        kind: "type-name",
        name: "void",
      },
      isConst: false,
      isNoExcept: false,
      isOffThread: false,
    },
  ],
  [
    "(n: int)",
    {
      kind: "function",
      args: [
        {
          name: "n",
          type: {
            kind: "type-name",
            name: "int",
          },
        },
      ],
      ret: {
        kind: "type-name",
        name: "void",
      },
      isConst: false,
      isNoExcept: false,
      isOffThread: false,
    },
  ],
  [
    "(a: (b: c) -> d) -> e",
    {
      kind: "function",
      args: [
        {
          name: "a",
          type: {
            kind: "function",
            args: [
              {
                name: "b",
                type: {
                  kind: "type-name",
                  name: "c",
                },
              },
            ],
            isConst: false,
            isNoExcept: false,
            isOffThread: false,
            ret: {
              kind: "type-name",
              name: "d",
            },
          },
        },
      ],
      ret: {
        kind: "type-name",
        name: "e",
      },
      isConst: false,
      isNoExcept: false,
      isOffThread: false,
    },
  ],
  [
    "() const noexcept -> void",
    {
      kind: "function",
      args: [],
      ret: {
        kind: "type-name",
        name: "void",
      },
      isConst: true,
      isNoExcept: true,
      isOffThread: false,
    },
  ],
  [
    "foo const*&&",
    {
      kind: "rref",
      type: {
        kind: "pointer",
        type: {
          kind: "const",
          type: {
            kind: "type-name",
            name: "foo",
          },
        },
      },
    },
  ],
  [
    "const int&",
    {
      kind: "ref",
      type: {
        kind: "const",
        type: {
          kind: "type-name",
          name: "int",
        },
      },
    },
  ],
  [
    "const std::vector<int>&",
    {
      kind: "ref",
      type: {
        kind: "const",
        type: {
          kind: "template-instance",
          name: "std::vector",
          templateArguments: [
            {
              kind: "type-name",
              name: "int",
            },
          ],
        },
      },
    },
  ],
];

describe("type parser", () => {
  for (const [text, expectedResult] of TESTS) {
    it(`parses "${text}"`, () => {
      const result = parseTypeSpec(text);
      expect(result).deep.equals(expectedResult);
    });
  }
});
