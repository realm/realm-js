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
import https from "node:https";
import * as network from "../platform/network";
import { assert, extendDebug } from "../internal";
const debug = extendDebug("network");
const HTTP_METHOD = {
    [0 /* binding.HttpMethod.get */]: "get",
    [1 /* binding.HttpMethod.post */]: "post",
    [3 /* binding.HttpMethod.put */]: "put",
    [2 /* binding.HttpMethod.patch */]: "patch",
    [4 /* binding.HttpMethod.del */]: "delete",
};
function flattenHeaders(headers) {
    const result = {};
    for (const key in headers) {
        const value = headers[key];
        if (typeof value === "string") {
            result[key] = value;
        }
        else if (Array.isArray(value)) {
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
    async fetch(request) {
        const options = {
            method: HTTP_METHOD[request.method],
            timeout: Number(request.timeoutMs),
            headers: request.headers,
        };
        debug("requesting", { url: request.url, body: request.body, usesRefreshToken: request.usesRefreshToken, options });
        const requester = request.url.startsWith("https://") ? https.request : http.request;
        return new Promise((resolve, reject) => {
            try {
                const req = requester(request.url, options, (res) => {
                    debug("responded", {
                        statusCode: res.statusCode,
                        statusMessage: res.statusMessage,
                        headers: res.headers,
                    });
                    let body = "";
                    res.setEncoding("utf8");
                    res.on("data", (chunk) => {
                        assert.string(chunk, "chunk");
                        body += chunk;
                    });
                    res.once("end", () => {
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
                    });
                    // Propagate any error though the promise
                    res.once("error", reject);
                });
                req.once("error", reject);
                // Write the request body
                req.end(request.body, "utf8");
            }
            catch (err) {
                reject(err);
            }
        });
    },
});
//# sourceMappingURL=network.js.map