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

import { lexer } from "../spec/type-lexer";

const TESTS = {
  Identifier: ["foo", "foo_bar", "fooBar", "abc123"],
  LeftParentheses: ["("],
  RightParentheses: [")"],
  DoubleColon: ["::"],
  Colon: [":"],
  LessThan: ["<"],
  GreaterThan: [">"],
  Comma: [","],
  DoubleAmpersand: ["&&"],
  Ampersand: ["&"],
  Star: ["*"],
  Minus: ["-"],
  RightArrow: ["->"],
  /*
  Operator: [
    "{",
    "}",
    "[",
    "]",
    "?",
    "~",
    ";",
    "!=",
    "!",
    "##",
    "#",
    "%=",
    "%",
    "&=",
    "*=",
    "++",
    "+=",
    "+",
    "->*",
    "--",
    "-=",
    "/=",
    "/",
    "<<=",
    "<=>",
    "<=",
    "<<",
    ">>=",
    ">>",
    ">=",
    "==",
    "=",
    "^=",
    "^",
    "|=",
    "||",
    "|",
    "...",
    ".*",
    ".",
  ],
  */
};

describe("type lexer", () => {
  for (const [tokenType, texts] of Object.entries(TESTS)) {
    describe(`tokenizes to ${tokenType}`, () => {
      for (const text of texts) {
        it(`given "${text}"`, () => {
          const result = lexer.tokenize(text);
          if (result.errors.length > 0) {
            const [err] = result.errors;
            throw new Error(err.message);
          }
          expect(result.tokens.length).equals(1);
          const [token] = result.tokens;
          expect(token.tokenType.name).equals(tokenType);
        });
      }
    });
  }
});
