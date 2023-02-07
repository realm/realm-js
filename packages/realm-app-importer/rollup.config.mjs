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

import typescript from "@rollup/plugin-typescript";
import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import dts from "rollup-plugin-dts";

import pkg from "./package.json" assert { type: "json" };

const external = ["abort-controller", "node-fetch", "path", "fs-extra", "glob", "deepmerge"];

export default [
  {
    input: "src/node/index.ts",
    output: [
      {
        file: pkg.main,
        format: "es",
      },
    ],
    plugins: [
      commonjs(),
      typescript({
        tsconfig: "src/node/tsconfig.json",
      }),
    ],
    external,
  },
  {
    input: "src/react-native/index.ts",
    output: [
      {
        file: pkg["react-native"],
        format: "es",
      },
    ],
    plugins: [
      typescript({
        tsconfig: "src/react-native/tsconfig.json",
      }),
      nodeResolve(),
    ],
  },
  {
    input: "types/generated/index.d.ts",
    output: {
      file: pkg.types,
      format: "es",
    },
    plugins: [dts()],
  },
];
