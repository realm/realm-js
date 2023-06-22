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

import process from "node:process";
import { URL } from "node:url";

import { ProxyType, SyncProxyConfig } from "realm/binding";
import { inject } from "../sync-proxy-config";

inject({
  create() {
    for (const envVar of ["HTTPS_PROXY", "https_proxy"]) {
      const proxyUrlAsString = process.env[envVar];
      if (proxyUrlAsString) {
        let type;
        const proxyUrl = new URL(proxyUrlAsString);
        const protocol = proxyUrl.protocol;
        if (protocol === "http:") {
          type = ProxyType.Http;
        } else if (protocol === "https:") {
          type = ProxyType.Https;
        } else {
          throw new Error(`Expected either 'http' or 'https' as protocol for ${envVar} (got ${protocol})`);
        }

        const config = {
          address: proxyUrl.hostname,
          type,
          port: parseInt(proxyUrl.port, 10),
        };
        return config;
      }
    }

    // no environment variable found, and we skip the proxy configuration
    return undefined;
  },
});
