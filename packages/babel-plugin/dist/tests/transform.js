"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transform = void 0;
const babel = __importStar(require("@babel/core"));
const plugin_1 = __importDefault(require("../plugin"));
function transform({ source, extraPresets = [], extraPlugins = [] }) {
    const result = babel.transform(source, {
        filename: "test.ts",
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
        plugins: [plugin_1.default, ["@babel/plugin-proposal-decorators", { legacy: true }], ...extraPlugins],
        ast: true,
    });
    if (result) {
        // console.log(result.code);
        return result;
    }
    else {
        throw new Error("Failed to transform!");
    }
}
exports.transform = transform;
