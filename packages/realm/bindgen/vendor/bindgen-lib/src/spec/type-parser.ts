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

import { strict as assert } from "assert";
import { IToken } from "chevrotain";

import { TypeSpec, FunctionTypeSpec, TypeModifierSpec, TypeNameSpec } from "./model";
import { lexer, TOKEN_TYPES } from "./type-lexer";

function makeTypeName(name: string): TypeNameSpec {
  assert(name);
  return { kind: "type-name", name };
}

type Modifiers = TypeModifierSpec["kind"];
function modify(type: TypeSpec, modifier: Modifiers) {
  return { kind: modifier, type };
}

// Unique symbol to request any identifier token (and keywords)
const ID = Symbol();

class TokCursor {
  pos = 0;
  readonly tokens: Readonly<IToken[]>;
  constructor(public text: string) {
    const { tokens, errors } = lexer.tokenize(text);
    if (errors.length > 0) {
      const [err] = errors;
      // Can't use this.error() here since it is based on pos, and we haven't started iterating the tokens yet.
      throw new Error(err.message);
    }
    this.tokens = tokens;
  }

  atEnd() {
    assert(this.pos >= 0, "internal error! negative pos");
    assert(this.pos <= this.tokens.length, "internal error! bad pos");
    return this.pos == this.tokens.length;
  }

  nextIs(arg: string | typeof ID): boolean {
    const tok = this.tokens[this.pos];
    return !!tok && (arg == ID ? tok.tokenType == TOKEN_TYPES.Identifier : tok.image == arg);
  }

  tryTake(arg: string | typeof ID): IToken | false {
    return this.nextIs(arg) && this.tokens[this.pos++];
  }

  take(arg?: string | typeof ID, message?: string): IToken {
    const tok = this.tokens[this.pos++];
    this.assert(!!tok, message ?? "unexpected end of input", tok);
    if (arg) {
      if (arg == ID) {
        this.assert(
          tok.tokenType == TOKEN_TYPES.Identifier,
          message ?? `expected an identifier but found ${tok.image}`,
          tok,
        );
      } else {
        this.assert(tok.image == arg, message ?? `expected '${arg}' but found ${tok.image}`, tok);
      }
    }
    return tok;
  }

  assertAtEnd() {
    this.assert(this.atEnd(), "unexpected trailing symbols");
  }

  assert(cond: boolean, message: string | (() => string), tok?: IToken): asserts cond {
    if (!cond) {
      // message can be a lambda if potentially expensive.
      if (typeof message != "string") {
        message = message();
      }
      this.error(message, tok);
    }
  }
  assertPriorTok(cond: boolean, message: string | (() => string)): asserts cond {
    assert(this.pos > 0, "internal error! no toks taken yet.");
    this.assert(cond, message, this.tokens[this.pos - 1]);
  }

  toString(tok?: IToken) {
    // TODO stash source ranges on the parsed types and pull this out to a free function
    // so that we can make use of this when errors occur in binding (like "no such type").
    let out = this.text;
    if (this.pos >= this.tokens.length) {
      out += "\n AT END";
    } else {
      tok = tok ?? this.tokens[this.pos];
      const start = tok.startColumn ?? 1;
      const end = tok.endColumn ?? 1 + this.text.length;

      const caretSymbol = tok.startColumn == undefined ? "~" : "^";
      const caret = caretSymbol.padEnd(end - start + 1, "~").padStart(end);
      out += "\n" + caret;
    }
    return out;
  }

  error(message: string, tok?: IToken): never {
    throw new Error(`parse error: ${message}\n${this.toString(tok)}`);
  }
}

function parseFunctionTypeImpl(c: TokCursor): FunctionTypeSpec {
  c.take("(");
  const args = [];
  while (!c.tryTake(")")) {
    const name = c.take(ID).image;
    c.take(":", "Function arguments use 'name: type' syntax. Did you forget to convert from C++ syntax?");
    const type = parseTypeImpl(c);
    args.push({ name, type });
    if (c.tryTake(",")) continue;
    c.assert(c.nextIs(")"), "expected , or )");
  }

  const modifiers = { isConst: false, isNoExcept: false, isOffThread: false };
  const modMapping = { const: "isConst", noexcept: "isNoExcept", off_thread: "isOffThread" } as const;
  while (c.nextIs(ID)) {
    const mod = c.take().image;
    c.assertPriorTok(
      mod in modMapping,
      () => `Unknown function modifier ${mod}. Expected one of ${Object.keys(modMapping).join(", ")}.`,
    );
    const typedMod = mod as keyof typeof modMapping; // TS should know this!
    const modKey = modMapping[typedMod];
    c.assertPriorTok(!modifiers[modKey], () => `Duplicate function modifier ${mod}`);
    modifiers[modKey] = true;
  }

  let ret;
  if (c.tryTake("->")) {
    ret = parseTypeImpl(c);
  } else {
    ret = makeTypeName("void");
  }
  return { kind: "function", args, ret, ...modifiers };
}

function parseTypeImpl(c: TokCursor): TypeSpec {
  if (c.nextIs("(")) {
    return parseFunctionTypeImpl(c);
  }

  const isConst = c.tryTake("const");
  const name = c.take(ID).image;
  let type: TypeSpec;
  if (c.tryTake("<")) {
    const templateArguments = [];
    while (!c.tryTake(">")) {
      templateArguments.push(parseTypeImpl(c));
      if (c.tryTake(",")) continue;
      c.assert(c.nextIs(">"), "expected , or >");
    }
    type = { kind: "template-instance", name, templateArguments };
  } else {
    type = makeTypeName(name);
  }

  if (isConst) type = modify(type, "const");

  while (!c.atEnd()) {
    if (c.tryTake("const")) {
      c.assertPriorTok(type.kind != "const", "redundant const");
      type = modify(type, "const");
    } else if (c.tryTake("*")) {
      type = modify(type, "pointer");
    } else {
      break;
    }
  }

  if (c.tryTake("&")) {
    type = modify(type, "ref");
  } else if (c.tryTake("&&")) {
    type = modify(type, "rref");
  }

  c.assert(!["&", "&&", "const", "*"].some((mod) => c.nextIs(mod)), "no modifiers allowed after references");

  return type;
}

export function parseTypeSpec(text: string) {
  const c = new TokCursor(text);
  const type = parseTypeImpl(c);
  c.assertAtEnd();
  return type;
}

export function parseMethodSpec(text: string) {
  const c = new TokCursor(text);
  if (!c.nextIs("(")) {
    // TODO planning to add virtual and abstract keywords here.
    throw new Error(`Expected a function: ${text}`);
  }
  const type = parseFunctionTypeImpl(c);
  c.assertAtEnd();
  return type;
}
