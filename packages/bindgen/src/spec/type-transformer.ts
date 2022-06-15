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

import { CstNode } from "chevrotain";
import { TypeSpec, FunctionTypeSpec, ArgumentSpec, TypeModifiersSpec } from "./model";
import { parse, parser } from "./type-parser";

import { extend } from "../debug";

const debug = extend("type-visitor");

const BaseCstVisitor = parser.getBaseCstVisitorConstructor();

class CstToTypeSpecTransformer extends BaseCstVisitor {
  constructor() {
    super();
    this.validateVisitor();
  }

  type(ctx: any): TypeSpec {
    debug("Visiting type %o", ctx);
    const names = this.visit(ctx.qualifyingName);
    if (ctx.templateInstance) {
      return this.visit(ctx.templateInstance, names);
    } else if (ctx.function) {
      return this.visit(ctx.function);
    } else {
      return {
        kind: "qualifying-name",
        names,
        isConst: false,
        isReference: false,
        isRvalueReference: false,
        isPointer: false,
        ...this.visit(ctx.typeModifiers),
      };
    }
  }

  qualifyingName(ctx: any): string[] {
    debug("Visiting qualifyingName %o", ctx);
    return ctx.Identifier.map(({ image }: any) => image);
  }

  function(ctx: any): FunctionTypeSpec {
    debug("Visiting function %o", ctx);
    return {
      kind: "function",
      arguments: ctx.functionArgument ? ctx.functionArgument.map((arg: CstNode) => this.visit(arg)) : [],
      ...this.visit(ctx.functionModifiers),
      return: ctx.ReturnType
        ? this.visit(ctx.ReturnType)
        : {
            kind: "qualifying-name",
            names: ["void"],
            isConst: false,
            isReference: false,
            isRvalueReference: false,
            isPointer: false,
          },
    };
  }

  functionArgument(ctx: any): ArgumentSpec {
    debug("Visiting functionArgument %o", ctx);
    return {
      name: ctx.Identifier[0].image,
      type: this.visit(ctx.type),
    };
  }

  templateInstance(ctx: any, names: string[]): TypeSpec {
    debug("Visiting templateInstance %o", ctx);
    return {
      kind: "template-instance",
      names,
      templateArguments: ctx.type.map((t: CstNode) => this.visit(t)),
      isConst: false,
      isReference: false,
      isRvalueReference: false,
      isPointer: false,
      ...this.visit(ctx.typeModifiers),
    };
  }

  typeModifiers(ctx: any): TypeModifiersSpec {
    debug("Visiting typeModifiers %o", ctx);
    return {
      isConst: !!ctx.Const,
      isReference: !!ctx.Reference,
      isRvalueReference: !!ctx.RvalueReference,
      isPointer: !!ctx.Pointer,
    };
  }

  functionModifiers(ctx: any): Pick<FunctionTypeSpec, "isConst" | "isNoExcept"> {
    debug("Visiting functionModifiers %o", ctx);
    return { isConst: !!ctx.Const, isNoExcept: !!ctx.NoExcept };
  }
}

export function parseTypeSpec(text: string): TypeSpec | undefined {
  const node = parse(text);
  const visitor = new CstToTypeSpecTransformer();
  return visitor.visit(node);
}
