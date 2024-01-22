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

/* eslint-env node */

import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import typescript from "@rollup/plugin-typescript";
import replace from "@rollup/plugin-replace";
import dts from "rollup-plugin-dts";
import istanbul from "rollup-plugin-istanbul";

import pkg from "./package.json" assert { type: "json" };

const mainExport = pkg.exports["."];
// Default is '{,**/}*.(cts|mts|ts|tsx)', we add js, mjs and json to include "realm/binding" in the binding
// This is actually a workaround for https://github.com/rollup/plugins/issues/1663
const typescriptInclude = "{,**/}*.(cts|mts|ts|tsx|js|mjs|json)";

const { ENABLE_TEST_COVERAGE_INSTRUMENTATION } = process.env;
if (ENABLE_TEST_COVERAGE_INSTRUMENTATION) {
  // eslint-disable-next-line no-console
  console.warn(`\n\n!!! WARNING: Instrumenting ${mainExport.node} for test coverage !!!\n`);
}

export default [
  {
    input: "src/platform/node/index.ts",
    output: [
      {
        file: "./dist/bundle.node.js",
        format: "cjs",
        sourcemap: true,
      },
    ],
    plugins: [
      ENABLE_TEST_COVERAGE_INSTRUMENTATION === "true"
        ? istanbul({
            include: ["src/**"],
          })
        : undefined,
      nodeResolve({
        modulesOnly: true,
        preferBuiltins: true,
        exportConditions: ["node", "module", "main"],
      }),
      replace({
        preventAssignment: true,
        delimiters: ["", ""],
        values: {
          '"./realm.node"': '"../generated/ts/realm.node"',
        },
      }),
      json(),
      typescript({
        tsconfig: "src/platform/node/tsconfig.json",
        noEmitOnError: true,
        outputToFilesystem: true,
        include: typescriptInclude,
      }),
    ],
    external: ["bson", "debug", "node:module", "node:fs", "node:path"],
  },
  {
    input: "src/platform/react-native/index.ts",
    output: {
      file: "./dist/bundle.react-native.js",
      format: "cjs",
      sourcemap: true,
    },
    plugins: [
      nodeResolve({
        mainFields: ["react-native", "browser", "module", "main"],
        exportConditions: ["react-native", "browser", "module", "main"],
        resolveOnly: ["@realm/fetch", "path-browserify"],
      }),
      // We need to use `commonjs` because of "path-browserify"
      commonjs(),
      json(),
      typescript({
        tsconfig: "src/platform/react-native/tsconfig.json",
        noEmitOnError: true,
        outputToFilesystem: true,
        include: typescriptInclude,
      }),
    ],
    external: ["bson", "debug", "react-native"],
  },
  {
    input: "src/index.ts",
    output: {
      file: "dist/bundle.d.ts",
      format: "es",
    },
    plugins: [
      dts({
        respectExternal: true,
        compilerOptions: {
          stripInternal: true,
          noResolve: false,
        },
      }),
    ],
    external: ["bson"],
  },
];
