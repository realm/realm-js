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

import { TemplateContext } from "./context";

// TOOO: Load these dynamically

import { generateTypeScript } from "./templates/typescript";
import { generateNode } from "./templates/node";
import { generateNodeWrapper } from "./templates/node-wrapper";

export type Template = (context: TemplateContext) => void;

export enum TemplateName {
  typescript = "typescript",
  node = "node",
  node_wrapper = "node-wrapper",
}

export const TEMPLATES: Record<TemplateName, Template> = {
  [TemplateName.typescript]: generateTypeScript,
  [TemplateName.node]: generateNode,
  [TemplateName.node_wrapper]: generateNodeWrapper,
};
