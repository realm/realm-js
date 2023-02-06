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
import fetch, { Response } from "node-fetch";

import * as network from "../platform/network";

import { binding, extendDebug } from "../internal";

const debug = extendDebug("network");

const HTTP_METHOD: Record<binding.HttpMethod, string> = {
  [binding.HttpMethod.get]: "get",
  [binding.HttpMethod.post]: "post",
  [binding.HttpMethod.put]: "put",
  [binding.HttpMethod.patch]: "patch",
  [binding.HttpMethod.del]: "delete",
};

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

network.inject({
  async fetch(request): Promise<network.Response> {
    debug("requesting", request);
    const { url, method, body, ...rest } = request;
    const response = await fetch(url, {
      method: HTTP_METHOD[method],
      ...rest,
      // Binding uses empty string to signal a missing body
      body: body || undefined,
    });
    const result: network.Response = {
      ...response,
      body: await extractBody(response),
      headers: Object.fromEntries(response.headers.entries()),
      httpStatusCode: response.status,
      // TODO: Determine if we want to set this differently
      customStatusCode: 0,
    };
    debug("responded", result);
    return result;
  },
});
