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

import { FetchHeaders, Request, RequestMethod, assert, binding, network } from "../internal";

const HTTP_METHOD: Record<binding.HttpMethod, RequestMethod> = {
  [binding.HttpMethod.get]: "GET",
  [binding.HttpMethod.post]: "POST",
  [binding.HttpMethod.put]: "PUT",
  [binding.HttpMethod.patch]: "PATCH",
  [binding.HttpMethod.del]: "DELETE",
};

function flattenHeaders(headers: FetchHeaders) {
  const result: Record<string, string> = {};
  headers.forEach((value: string, key: string) => {
    result[key] = value;
  });
  return result;
}

/*
async function extractBody(response: Response): Promise<string> {
  const contentType = response.headers.get("content-type");
  if (contentType === null) {
    return "";
  } else if (contentType === "application/json") {
    return response.text();
  } else {
    throw new Error(`Server responded with an unexpected '${contentType}' content type`);
  }
}


const HTTP_METHOD: Record<binding.HttpMethod, string> = {
  [binding.HttpMethod.get]: "get",
  [binding.HttpMethod.post]: "post",
  [binding.HttpMethod.put]: "put",
  [binding.HttpMethod.patch]: "patch",
  [binding.HttpMethod.del]: "delete",
};

*/

/** @internal */
export function createNetworkTransport() {
  return binding.Helpers.makeNetworkTransport(({ method, timeoutMs, body, headers, url }, callback) => {
    // TODO: Determine if checking the method is even needed
    network
      .fetch({
        url,
        headers,
        method: HTTP_METHOD[method],
        timeoutMs: Number(timeoutMs),
        body: body !== "" ? body : undefined,
      })
      .then(
        async (response) => {
          const headers = flattenHeaders(response.headers);
          const contentType = headers["content-type"];
          const body = contentType ? await response.text() : "";
          callback({
            customStatusCode: 0,
            httpStatusCode: response.status,
            headers,
            body,
          });
        },
        (err) => {
          // Core will propagate any non-zero "custom status code" through to the caller
          // The error message is passed through the body
          const reason = err.message || "Unknown";
          const body = `request to ${url} failed, reason: ${reason}`;
          callback({ httpStatusCode: 0, headers: {}, customStatusCode: -1, body });
        },
      );
  });
}
