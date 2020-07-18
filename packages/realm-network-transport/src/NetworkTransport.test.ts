////////////////////////////////////////////////////////////////////////////
//
// Copyright 2020 Realm Inc.
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

import { expect } from "chai";
import { createServer, RequestListener, Server } from "http";

import { DefaultNetworkTransport } from "./NetworkTransport";
import { Response, NetworkTransport, Request } from "./types";

function getServerUrl(server: Server) {
    const address = server.address();
    if (address && typeof address === "object") {
        return `http://localhost:${address.port}`;
    } else {
        throw new Error("Unable to determine server URL");
    }
}

async function createTestServer(listener: RequestListener): Promise<Server> {
    const server = createServer(listener);
    await new Promise(resolve => server.listen(0, resolve));
    return server;
}

describe("Realm Network Transport", () => {
    // Create some tests!
    it("constructs", () => {
        const transport = new DefaultNetworkTransport();
        expect(transport).is.instanceOf(DefaultNetworkTransport);
    });

    describe("requesting with fetchAndParse", () => {
        it("sends and receives GET requests", async () => {
            const transport = new DefaultNetworkTransport();
            const server = await createTestServer((req, res) => {
                res.setHeader("content-type", "application/json");
                res.end(JSON.stringify({ pong: "Hi GET request" }));
            });

            try {
                const url = getServerUrl(server);
                const response = await transport.fetchAndParse({
                    method: "GET",
                    url,
                });
                expect(response).deep.equals({ pong: "Hi GET request" });
            } finally {
                server.close();
            }
        });

        it("sends, receives and parses POST requests", async () => {
            const transport = new DefaultNetworkTransport();
            const server = await createTestServer((req, res) => {
                expect(req.headers.accept).equals("application/json");
                res.setHeader("content-type", "application/json");
                req.once("data", (chunk: Buffer) => {
                    const body = chunk.toString("utf8");
                    const parsedBody = JSON.parse(body);
                    const encodedResponseBody = JSON.stringify({
                        pong: parsedBody.ping + " World",
                    });
                    res.end(encodedResponseBody);
                });
            });

            try {
                const url = getServerUrl(server);
                const response = await transport.fetchAndParse({
                    method: "POST",
                    url,
                    body: { ping: "Hello" },
                });
                expect(response).deep.equals({ pong: "Hello World" });
            } finally {
                server.close();
            }
        });
    });

    describe("requesting with fetchWithCallbacks", () => {
        function fetchWithCallbacksPromised(
            transport: NetworkTransport,
            request: Request<any>,
        ) {
            return new Promise<Response>((resolve, reject) => {
                transport.fetchWithCallbacks(request, {
                    onSuccess: resolve,
                    onError: reject,
                });
            });
        }

        it("sends and receives GET requests", async () => {
            const transport = new DefaultNetworkTransport();
            const server = await createTestServer((req, res) => {
                res.setHeader("content-type", "application/json");
                res.end(JSON.stringify({ pong: "Hi GET request" }));
            });

            try {
                const url = getServerUrl(server);
                const response = await fetchWithCallbacksPromised(transport, {
                    url,
                    method: "GET",
                });
                expect(response.statusCode).equals(200);
                const decodedBody = JSON.parse(response.body);
                expect(decodedBody).deep.equals({
                    pong: "Hi GET request",
                });
                // Call the method;
            } finally {
                server.close();
            }
        });

        it("sends, receives and parses POST requests", async () => {
            const transport = new DefaultNetworkTransport();
            const server = await createTestServer((req, res) => {
                expect(req.headers.accept).equals("application/json");
                res.setHeader("content-type", "application/json");
                req.once("data", (chunk: Buffer) => {
                    const body = chunk.toString("utf8");
                    const parsedBody = JSON.parse(body);
                    const encodedResponseBody = JSON.stringify({
                        pong: parsedBody.ping + " World",
                    });
                    res.end(encodedResponseBody);
                });
            });

            try {
                const url = getServerUrl(server);
                const response = await fetchWithCallbacksPromised(transport, {
                    method: "POST",
                    url,
                    body: { ping: "Hello" },
                });
                const decodedBody = JSON.parse(response.body);
                expect(decodedBody).deep.equals({ pong: "Hello World" });
            } finally {
                server.close();
            }
        });
    });
});
