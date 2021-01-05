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
import dts from "rollup-plugin-dts";

import pkg from "./package.json";

export default [
    {
        input: "src/index.ts",
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
            typescript({
                tsconfig: "tsconfig.json",
            }),
        ],
        external: ["realm-web", "react"],
    },
    {
        input: "dist/declarations/index.d.ts",
        output: {
            file: "dist/bundle.d.ts",
            format: "es",
        },
        external: ["realm-web", "react"],
        plugins: [
            dts({
                // Ensures that the realm-network-transport types are included in the bundle
                respectExternal: true,
            }),
        ],
    },
];
