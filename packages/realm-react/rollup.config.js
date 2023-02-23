////////////////////////////////////////////////////////////////////////////
//
// Copyright 2023 Realm Inc.
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

import nodeResolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";

import pkg from "./package.json" assert { type: "json" };

export default [
  {
    input: "src/index.tsx",
    output: [
      {
        file: pkg.main,
        format: "esm",
        sourcemap: true,
      },
    ],
    plugins: [nodeResolve(), typescript()],
    external: ["realm", "react", "@realm/common", "lodash"],
  },
  {
    input: "src/index.tsx",
    output: {
      file: pkg.types,
      format: "es",
    },
    plugins: [
      dts({
        respectExternal: true,
      }),
    ],
    external: ["realm", "react", "@realm/common", "lodash"],
  },
];
