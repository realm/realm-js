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
    },
    {
        input: "types/index.d.ts",
        output: {
            file: "dist/bundle.d.ts",
            format: "es",
        },
        plugins: [dts(), resolve()],
    },
];
