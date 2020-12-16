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

declare module "jwt-encode" {
    type Options = { alg: "HS256"; typ: "JWT"; [key: string]: any };
    /**
     * Create a very basic JWT signature.
     *
     * @param data The data object you want to have signed.
     * @param secret Secret to use to sign token with.
     * @param options JWT header options.
     * @returns The signed JSON Web Token.
     */
    function sign(data: object, secret: string, options?: Options): string;
    export = sign;
}
