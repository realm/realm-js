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
import { inject } from "../https-proxy";

inject({
  create() {
    let config: SyncProxyConfig;
    ["HTTPS_PROXY", "https_proxy"].forEach((envVar) => {
      const proxyUrlAsString = process.env[envVar];
      if (proxyUrlAsString) {
        const proxyUrl = new URL(proxyUrlAsString);
        config.address = proxyUrl.hostname;
        config.port = Number(proxyUrl.port);
        const protocol = proxyUrl.protocol;
        if (protocol === "http") {
          config.type = ProxyType.Http;
        } else if (protocol === "https") {
          config.type = ProxyType.Https;
        } else {
          throw new Error(`Expected either 'http' or 'https' as protocol for ${envVar} (got ${protocol})`);
        }
      }
      return config;
    });

    // no environment variable found, and we skip the proxy configuration
    return undefined;
  },
});
