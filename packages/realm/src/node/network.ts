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
import http from "node:http";

import * as network from "../platform/network";

import { assert, binding } from "../internal";

const HTTP_METHOD: Record<binding.HttpMethod, string> = {
  [binding.HttpMethod.get]: "get",
  [binding.HttpMethod.post]: "post",
  [binding.HttpMethod.put]: "put",
  [binding.HttpMethod.patch]: "patch",
  [binding.HttpMethod.del]: "del",
};

function flattenHeaders(headers: http.IncomingHttpHeaders) {
  const result: Record<string, string> = {};
  for (const key in headers) {
    const value = headers[key];
    if (typeof value === "string") {
      result[key] = value;
    } else if (Array.isArray(value)) {
      // Notice: If multiple headers of the same key is returned from the server, the last entry win
      const item = value.shift();
      if (typeof item === "string") {
        result[key] = item;
      }
    }
  }
  return result;
}

network.inject({
  async fetch(request): Promise<network.Response> {
    return new Promise((resolve) => {
      const req = http.request(
        request.url,
        {
          method: HTTP_METHOD[request.method],
          timeout: Number(request.timeoutMs),
          headers: request.headers,
        },
        (res) => {
          res.setEncoding("utf8");
          const body = res.read();
          assert.string(body, "body");
          const { headers, statusCode } = res;
          assert.number(statusCode, "response status code");
          assert.object(headers, "headers");
          resolve({
            body,
            headers: flattenHeaders(headers),
            httpStatusCode: statusCode,
            // TODO: Determine if we want to set this differently
            customStatusCode: 0,
          });
        },
      );
      // Write the request body
      req.write(request.body, "utf8");
      req.end();
    });
  },
});
