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

import { FetchHeaders, binding, network } from "../../internal";
import { inject } from "../platform-networking";

function flattenHeaders(headers: FetchHeaders) {
  const result: Record<string, string> = {};
  headers.forEach((value: string, key: string) => {
    result[key] = value;
  });
  return result;
}

/** @internal */
inject(function () {
  return binding.Helpers.makeNetworkTransport((request, callback) => {
    network.fetch(request).then(
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
        const body = `request to ${request.url} failed, reason: ${reason}`;
        callback({ httpStatusCode: 0, headers: {}, customStatusCode: -1, body });
      },
    );
  });
});