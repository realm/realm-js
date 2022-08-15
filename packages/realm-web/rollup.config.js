////////////////////////////////////////////////////////////////////////////
//
// Copyright 2020 Realm Inc.
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

import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import nodeResolve from "@rollup/plugin-node-resolve";
import replace from "@rollup/plugin-replace";
import dts from "rollup-plugin-dts";

import pkg from "./package.json";

const replacer = replace({
  __SDK_VERSION__: JSON.stringify(pkg.version),
});

export default [
  {
    input: "src/node/index.ts",
    output: [
      {
        file: pkg.main,
        format: "cjs",
      },
      {
        file: pkg.module,
        format: "es",
      },
    ],
    plugins: [
      commonjs(),
      typescript({
        tsconfig: "src/node/tsconfig.json",
      }),
      nodeResolve(),
      replacer,
    ],
    external: ["bson", "node-fetch", "util", "abort-controller"],
  },
  {
    input: "src/dom/index.ts",
    output: [
      {
        file: pkg.browser[pkg.main],
        format: "cjs",
      },
      {
        file: pkg.browser[pkg.module],
        format: "es",
      },
    ],
    plugins: [
      commonjs(),
      typescript({
        tsconfig: "src/dom/tsconfig.json",
      }),
      nodeResolve({
        browser: true,
      }),
      replacer,
    ],
    external: ["bson"],
  },
  {
    input: "src/dom/index.ts",
    output: [
      {
        file: "dist/bundle.iife.js",
        name: "Realm",
        format: "iife",
      },
    ],
    plugins: [
      commonjs(),
      typescript({
        tsconfig: "src/dom/tsconfig.json",
      }),
      nodeResolve({
        browser: true,
        preferBuiltins: false,
      }),
      replacer,
    ],
  },
  {
    input: "types/generated/dom/index.d.ts",
    output: {
      file: "dist/bundle.d.ts",
      format: "es",
      intro: '/// <reference path="../types/realm/app.d.ts" />',
    },
    plugins: [
      dts({
        // Ensures that the realm-network-transport types are included in the bundle
        respectExternal: true,
      }),
      nodeResolve(),
    ],
    external: ["bson"],
  },
];
