import typescript from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";
import resolve from "@rollup/plugin-node-resolve";

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
                tsconfig: "tsconfig.build.json",
            }),
            resolve(),
        ],
        external: ["bson"],
    },
    {
        input: "types/generated/index.d.ts",
        output: {
            file: "dist/bundle.d.ts",
            format: "es",
            intro: '/// <reference path="../types/realm/index.d.ts" />',
        },
        plugins: [dts(), resolve()],
        // external: ["realm-network-transport"],
    },
];
