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

import { ApiError } from "./generated/core/ApiError";
import { ApiRequestOptions } from "./generated/core/ApiRequestOptions";
import { CancelablePromise } from "./generated/core/CancelablePromise";
import { OpenAPIConfig } from "./generated/core/OpenAPI";

import { DefaultNetworkTransport } from "@realm/network-transport";

const transport = new DefaultNetworkTransport();

function buildUrl(config: OpenAPIConfig, options: ApiRequestOptions) {
  const { path = {} } = options;
  let { url } = options;
  for (const [key, value] of Object.entries(path)) {
    url = url.split(`{${key}}`).join(value);
  }
  return config.BASE + url;
}

export function request<T>(config: OpenAPIConfig, options: ApiRequestOptions): CancelablePromise<T> {
  const abortController = new DefaultNetworkTransport.AbortController();
  const url = buildUrl(config, options);
  const { body, headers, mediaType } = options;
  console.log("Requesting", { url, body: options.body });
  const response = transport.fetch({
    signal: abortController.signal,
    ...options,
    url,
    body: JSON.stringify(body),
    headers: headers === undefined && mediaType ? { "content-type": mediaType } : headers,
  });
  return new CancelablePromise<T>((resolve, reject, oncancel) => {
    response.then(async (response) => {
      if (response.ok) {
        resolve(response.json());
      } else {
        const json = await response.json<Record<string, unknown>>();
        const message = typeof json.error === "string" ? json.error : response.statusText;
        const apiError = new ApiError(options, response, message);
        apiError.name = response.statusText;
        reject(apiError);
      }
    }, reject);
    oncancel(abortController.abort);
  });
}
