////////////////////////////////////////////////////////////////////////////
//
// Copyright 2024 Realm Inc.
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

import assert from "node:assert";

function createHeaders(authenticated = false) {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (authenticated) {
    const { BAASAAS_KEY } = process.env;
    assert(BAASAAS_KEY, "Missing BAASAAS_KEY env");
    headers["apiKey"] = BAASAAS_KEY;
  }
  return headers;
}

type RequestOptions = {
  url: URL;
  method: string;
  authenticated: boolean;
};

export async function request<R>(
  { url, method, authenticated }: RequestOptions,
  assertion: (response: unknown) => asserts response is R,
): Promise<R> {
  const response = await fetch(url, { method, headers: createHeaders(authenticated) });
  if (response.ok) {
    const json = await response.json();
    assertion(json);
    return json;
  } else if (response.headers.get("content-type") === "application/json") {
    const json = await response.json();
    throw new Error(`Request failed (${response.status} / ${response.statusText}): ${JSON.stringify(json)}`);
  } else {
    throw new Error(`Request failed (${response.status} / ${response.statusText})`);
  }
}
