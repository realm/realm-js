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

import * as babel from "@babel/core";

import plugin from "../plugin";

export type TransformOptions = {
  source: string;
  extraPresets?: babel.PluginItem[];
  extraPlugins?: babel.PluginItem[];
  filename?: string;
};

export function transform({
  source,
  extraPresets = [],
  extraPlugins = [],
  filename = "test.ts",
}: TransformOptions): babel.BabelFileResult {
  const result = babel.transform(source, {
    filename,
    presets: [
      // TODO: Consider moving this to a @realm/babel-preset
      [
        "@babel/preset-typescript",
        {
          // TODO: Document that this requires TypeScript >= 3.8 (see https://babeljs.io/docs/en/babel-preset-typescript#onlyremovetypeimports)
          onlyRemoveTypeImports: true,
        },
      ],
      ...extraPresets,
    ],
    plugins: [plugin, ["@babel/plugin-proposal-decorators", { legacy: true }], ...extraPlugins],
    ast: true,
  });
  if (result) {
    // console.log(result.code);
    return result;
  } else {
    throw new Error("Failed to transform!");
  }
}
