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

const Number = createToken({ name: "Number", pattern: /[0-9]+\.?[0-9]*/ });
const String = createToken({ name: "String", pattern: /"[^"]*"/ });
const Character = createToken({ name: "Character", pattern: /'[^']'/ });
const Identifier = createToken({ name: "Identifier", pattern: /[_a-zA-Z]+/ }); // TODO: Consider 0-9?
const Operator = createToken({ name: "Operation", pattern: /[{}[\]()?,~;]/ });
const WhiteSpace = createToken({
  name: "WhiteSpace",
  pattern: /\s+/,
  group: Lexer.SKIPPED,
});

export const lexer = new Lexer([WhiteSpace, Identifier, Number, Operator, Character, String]);
