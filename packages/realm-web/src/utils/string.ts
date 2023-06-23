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

import { removeKeysWithUndefinedValues } from "./objects";

/**
 * Generate a random sequence of characters.
 * @param length The length of the string.
 * @param alphabet The alphabet of characters to pick from.
 * @returns A string of characters picked randomly from `alphabet`.
 */
export function generateRandomString(length: number, alphabet: string): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return result;
}

/** Parameters passed in a query string */
export type QueryParams = {
  [key: string]: string | number | boolean;
};

/**
 * Encode an object mapping from string to string, into a query string to be appended a URL.
 * @param params The parameters to include in the string.
 * @param prefixed Should the "?" prefix be added if values exists?
 * @returns A URL encoded representation of the parameters (omitting a "?" prefix).
 */
export function encodeQueryString<P extends Partial<QueryParams>>(params: P, prefixed = true): string {
  // Filter out undefined values
  const cleanedParams = removeKeysWithUndefinedValues(params) as QueryParams;
  // Determine if a prefixed "?" is appropreate
  const prefix = prefixed && Object.keys(cleanedParams).length > 0 ? "?" : "";
  // Transform keys and values to a query string
  return (
    prefix +
    Object.entries(cleanedParams)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join("&")
  );
}

/**
 * Decodes a query string into an object.
 * @param str The query string to decode.
 * @returns The decoded query string.
 */
export function decodeQueryString(str: string): Record<string, string> {
  const cleanStr = str[0] === "?" ? str.substr(1) : str;
  return Object.fromEntries(
    cleanStr
      .split("&")
      .filter((s) => s.length > 0)
      .map((kvp) => kvp.split("="))
      .map(([k, v]) => [k, decodeURIComponent(v)]),
  );
}
