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

/**
 * Generate a random sequence of characters.
 *
 * @param length The length of the string.
 * @param alphabet The alphabet of characters to pick from.
 * @returns A string of characters picked randomly from `alphabet`.
 */
export function generateRandomString(length: number, alphabet: string) {
    let result = "";
    for (let i = 0; i < length; i++) {
        result += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return result;
}

/**
 * Encode an object mapping from string to string, into a query string to be appended a URL.
 *
 * @param params The parameters to include in the string.
 * @returns A URL encoded representation of the parameters.
 */
export function encodeQueryString(params: {
    [key: string]: string | number | boolean;
}) {
    return Object.entries(params)
        .map(([k, v]) => [k, encodeURIComponent(v)])
        .map(([k, v]) => `${k}=${v}`)
        .join("&");
}

/**
 * Decodes a query string into an object
 *
 * @param str The query string to decode.
 * @returns The decoded query string
 */
export function decodeQueryString(str: string) {
    return Object.fromEntries(
        str
            .split("&")
            .map(kvp => kvp.split("="))
            .map(([k, v]) => [k, decodeURIComponent(v)]),
    );
}
