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

import { createToken, Lexer } from "chevrotain";

export const TOKEN_TYPES = {
  WhiteSpace: createToken({
    name: "WhiteSpace",
    pattern: /\s+/,
    group: Lexer.SKIPPED,
  }),
  Const: createToken({ name: "Const", pattern: "const" }),
  NoExcept: createToken({ name: "NoExcept", pattern: "noexcept" }),
  Identifier: createToken({ name: "Identifier", pattern: /[_a-zA-Z]+[_a-zA-Z0-9]*/ }),
  /*
  Operator: createToken({
    name: "Operator",
    pattern:
      /[{}[\]?~;]|!=?|##?|%=?|&=|\*=|\+\+|\+=?|->\*|--|-=|\/=?|<<=|<=>?|<<|>>=?|>=|==?|\^=?|\|=|\|\|?|\.\.\.|\.\*|\./,
  }),
  */
  DoubleColon: createToken({ name: "DoubleColon", pattern: "::" }),
  Colon: createToken({ name: "Colon", pattern: ":" }),
  RightArrow: createToken({ name: "RightArrow", pattern: "->" }),
  Minus: createToken({ name: "Minus", pattern: "-" }),
  DoubleAmpersand: createToken({ name: "DoubleAmpersand", pattern: "&&" }),
  Ampersand: createToken({ name: "Ampersand", pattern: "&" }),
  Star: createToken({ name: "Star", pattern: "*" }),
  LeftParentheses: createToken({ name: "LeftParentheses", pattern: "(" }),
  RightParentheses: createToken({ name: "RightParentheses", pattern: ")" }),
  LessThan: createToken({ name: "LessThan", pattern: "<" }),
  GreaterThan: createToken({ name: "GreaterThan", pattern: ">" }),
  Comma: createToken({ name: "Comma", pattern: "," }),
};

export const lexer = new Lexer(Object.values(TOKEN_TYPES));
