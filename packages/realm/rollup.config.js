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

import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import replace from "@rollup/plugin-replace";
import nodeResolve from "@rollup/plugin-node-resolve";
import dts from "rollup-plugin-dts";

import pkg from "./package.json";

export default [
  {
    input: "src/node/index.ts",
    output: {
      file: pkg.main,
      format: "cjs",
    },
    plugins: [
      commonjs(),
      typescript({
        tsconfig: "src/node/tsconfig.json",
      }),
      nodeResolve(),
      replace({
        preventAssignment: true,
        delimiters: ["", ""],
        values: {
          '"./realm.node"': '"../generated/ts/realm.node"',
        },
      }),
    ],
    external: ["node:module", "node:fs", "bson"],
  },
  /*
  {
    input: "generated/types/src/index.d.ts",
    output: {
      file: pkg.types,
      format: "es",
    },
    plugins: [dts({ respectExternal: true })],
    external: ["bson"],
  },
  */
];
