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

import { CstNode, CstParser } from "chevrotain";

import { TOKEN_TYPES, lexer } from "./type-lexer";

class TypeParser extends CstParser {
  constructor() {
    super(TOKEN_TYPES);
    this.performSelfAnalysis();
  }

  type = this.RULE("type", () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.function) },
      {
        ALT: () => {
          this.OPTION({ DEF: () => this.CONSUME(TOKEN_TYPES.Const) });
          this.SUBRULE(this.qualifyingName);
          this.OPTION1({
            DEF: () => this.SUBRULE(this.templateInstance),
          });
          this.SUBRULE(this.typeModifiers);
        },
      },
    ]);
  });

  qualifyingName = this.RULE("qualifyingName", () => {
    this.AT_LEAST_ONE_SEP({
      SEP: TOKEN_TYPES.DoubleColon,
      DEF: () => this.CONSUME(TOKEN_TYPES.Identifier),
    });
  });

  typeModifiers = this.RULE("typeModifiers", () => {
    this.MANY({
      DEF: () => {
        this.OR([
          {
            ALT: () => this.CONSUME(TOKEN_TYPES.Const),
          },
          {
            ALT: () => this.CONSUME(TOKEN_TYPES.Star, { LABEL: "Pointer" }),
          },
        ]);
      },
    });
    this.OPTION({
      DEF: () => {
        this.OR1([
          {
            ALT: () => this.CONSUME(TOKEN_TYPES.Ampersand, { LABEL: "Reference" }),
          },
          {
            ALT: () => this.CONSUME(TOKEN_TYPES.DoubleAmpersand, { LABEL: "RvalueReference" }),
          },
        ]);
      },
    });
  });

  function = this.RULE("function", () => {
    this.CONSUME(TOKEN_TYPES.LeftParentheses);
    this.MANY_SEP({
      SEP: TOKEN_TYPES.Comma,
      DEF: () => {
        this.SUBRULE(this.functionArgument);
      },
    });
    this.CONSUME1(TOKEN_TYPES.RightParentheses);
    this.SUBRULE(this.functionModifiers);
    this.OPTION1({
      DEF: () => {
        this.CONSUME2(TOKEN_TYPES.RightArrow);
        this.SUBRULE1(this.type, { LABEL: "ReturnType" });
      },
    });
  });

  functionArgument = this.RULE("functionArgument", () => {
    this.CONSUME(TOKEN_TYPES.Identifier);
    this.CONSUME(TOKEN_TYPES.Colon);
    this.SUBRULE(this.type);
  });

  functionModifiers = this.RULE("functionModifiers", () => {
    this.MANY({
      DEF: () => {
        this.OR([
          {
            ALT: () => this.CONSUME(TOKEN_TYPES.Const),
          },
          {
            ALT: () => this.CONSUME1(TOKEN_TYPES.NoExcept),
          },
        ]);
      },
    });
  });

  templateInstance = this.RULE("templateInstance", () => {
    this.CONSUME(TOKEN_TYPES.LessThan);
    this.AT_LEAST_ONE_SEP({
      SEP: TOKEN_TYPES.Comma,
      DEF: () => {
        this.SUBRULE(this.type);
      },
    });
    this.CONSUME(TOKEN_TYPES.GreaterThan);
  });
}

export const parser = new TypeParser();

export function parse(text: string): CstNode {
  const { tokens, errors } = lexer.tokenize(text);
  if (errors.length > 0) {
    const [err] = errors;
    throw new Error(err.message);
  }
  parser.input = tokens;
  return parser.type();
}
