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

import { App } from "realm-web";

// This global is injected by WebPack
declare const APP_ID: string;
declare const BASE_URL: string;

export function createApp<
    FunctionsFactoryType extends object = Realm.DefaultFunctionsFactory
>() {
    if (typeof APP_ID !== "string") {
        throw new Error("Expected a global APP_ID");
    }
    if (typeof BASE_URL !== "string") {
        throw new Error("Expected a global BASE_URL");
    }
    return new App<FunctionsFactoryType>({
        id: APP_ID,
        baseUrl: BASE_URL,
    });
}

export function describeIf(
    condition: boolean,
    title: string,
    fn: (this: Mocha.Suite) => void,
) {
    if (condition) {
        describe(title, fn);
    } else {
        describe.skip(title, fn);
    }
}

export const INVALID_TOKEN =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE1MDAwMDAwMDAsImlhdCI6MTUwMDAwMDAwMCwic3ViIjoiMTIzNDU2Nzg5MCJ9.x3-ZWVJGjEltXWWa1uaBaN4oo7dOjPbgA46STVD5KKY";
