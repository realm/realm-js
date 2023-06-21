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

// NOTE: This file is only supposed to be imported from a Node.js environment

import http from "node:http";
import net from "node:net";
import { URL } from "node:url";

import { expect } from "chai";
import Realm, { ProxyType } from "realm";
import { importAppBefore } from "../hooks";
import { buildAppConfig } from "../utils/build-app-config";
import { generatePartition } from "../utils/generators";

function getSyncConfiguration(user: Realm.User, partition: string, addProxyConfig: boolean): Realm.Configuration {
  const realmConfig: Realm.Configuration = {
    schema: [
      {
        name: "Dog",
        primaryKey: "_id",
        properties: {
          _id: "objectId",
          breed: "string?",
          name: "string",
          partition: { type: "string", default: partition },
        },
      },
    ],
    sync: {
      user,
      partitionValue: partition,
    },
  };

  if (addProxyConfig) {
    realmConfig.sync.proxyConfig = {
      address: "127.0.0.1",
      port: 9876,
      type: ProxyType.HTTP,
    };
  }

  return realmConfig;
}

describe.skipIf(environment.missingServer, "Proxy support", function () {
  let proxyServer: http.Server;
  let nCalls = 0;

  importAppBefore(buildAppConfig("with-pbs").anonAuth().partitionBasedSync({ required: true }));

  beforeEach(() => {
    proxyServer = http.createServer((req, res) => {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("okay");
    });

    proxyServer.on("connect", (req, clientSocket, head) => {
      nCalls++;
      const { port, hostname } = new URL(`http://${req.url}`);
      const serverSocket = net.connect(Number(port) || 80, hostname, () => {
        clientSocket.write("HTTP/1.1 200 Connection Established\r\n" + "Proxy-agent: Node.js-Proxy\r\n" + "\r\n");
        serverSocket.write(head);
        serverSocket.pipe(clientSocket);
        clientSocket.pipe(serverSocket);
      });
    });

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    proxyServer.listen(9876, "127.0.0.1", () => {});
  });

  afterEach(() => {
    proxyServer.close();
    Realm.clearTestState();
    delete process.env["HTTPS_PROXY"];
  });

  [true, false].forEach((useEnvVar) => {
    it(`Using sync proxy through (environment variables = ${useEnvVar})`, async function () {
      this.timeout(60_000);

      expect(process.env["HTTPS_PROXY"]).is.undefined;
      if (useEnvVar) {
        process.env["HTTPS_PROXY"] = "http://127.0.0.1:9876";
      }

      const user = await this.app.logIn(Realm.Credentials.anonymous());
      const partition = generatePartition();
      const config = getSyncConfiguration(user, partition, useEnvVar);
      const realm = await Realm.open(config);
      await realm.syncSession?.downloadAllServerChanges();
      realm.close();

      expect(nCalls).to.not.equal(0);
    });
  });
});
