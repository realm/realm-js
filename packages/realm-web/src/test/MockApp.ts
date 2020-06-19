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

import { App } from "../App";
import { MockNetworkTransport } from "./MockNetworkTransport";
import { MemoryStorage } from "../storage";

/**
 * An App using the MockTransport
 */
export class MockApp extends App<any> {
    /**
     * The mock network transport created when creating this mock app.
     */
    public readonly mockTransport: MockNetworkTransport;

    /**
     * Create mocked App, useful when testing.
     *
     * @param id The id of the app.
     * @param requests An array of requests returned by the underlying mocked network transport.
     */
    constructor(id: string, requests: object[] = []) {
        const transport = new MockNetworkTransport(requests);
        const storage = new MemoryStorage();
        super({
            id,
            baseUrl: "http://localhost:1337",
            storage,
            transport,
        });
        this.mockTransport = transport;
    }
}
