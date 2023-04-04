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

import { DefaultNetworkTransport, FetchHeaders, FetchResponse, Method, Request } from "@realm/network-transport";

import { extendDebug } from "../debug";
import * as binding from "../binding";

export type { FetchHeaders, Request };

const debug = extendDebug("network");
const transport = new DefaultNetworkTransport();

type NetworkType = {
  fetch(request: Request): Promise<FetchResponse>;
  fetch(request: binding.Request): Promise<FetchResponse>;
};

const HTTP_METHOD: Record<binding.HttpMethod, Method> = {
  [binding.HttpMethod.Get]: "GET",
  [binding.HttpMethod.Post]: "POST",
  [binding.HttpMethod.Put]: "PUT",
  [binding.HttpMethod.Patch]: "PATCH",
  [binding.HttpMethod.Del]: "DELETE",
};

function toFetchRequest({ method, timeoutMs, body, headers, url }: binding.Request_Relaxed) {
  return {
    url,
    headers,
    method: HTTP_METHOD[method],
    timeoutMs: Number(timeoutMs),
    body: body !== "" ? body : undefined,
  };
}

export const network: NetworkType = {
  async fetch(request) {
    debug("Requesting %O", request);
    const fetchRequest = typeof request.method === "string" ? request : toFetchRequest(request);
    const response = await transport.fetch(fetchRequest);
    debug("Responded %O", response);
    return response;
  },
};

export function inject(injected: NetworkType) {
  Object.freeze(Object.assign(network, injected));
}
