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

import { Transport, PrefixedTransport, BaseTransport } from "../transports";
import { MockNetworkTransport } from "./MockNetworkTransport";

/**
 * A mocked network transport, which gets created with a list of responses to return in the order it's being requested.
 */
export class MockTransport extends BaseTransport implements Transport {
    /** Underlying (mocked) network transport */
    private readonly mockNetworkTransport: MockNetworkTransport;

    /**
     * Constructs a mocked transport useful when testing.
     *
     * @param responses A list of pre-recorded responses that will be returned when fetch is called.
     * @param baseUrl The base URL to prefix paths with.
     */
    constructor(responses: object[] = [], baseUrl = "http://localhost:1337") {
        const networkTransport = new MockNetworkTransport(responses);
        super(networkTransport, baseUrl, "");
        this.mockNetworkTransport = networkTransport;
    }

    /** @inheritdoc */
    public prefix(pathPrefix: string): Transport {
        return new PrefixedTransport(this, pathPrefix);
    }

    /**
     * @returns An array of requests "sent" by users of the transport.
     */
    get requests() {
        return this.mockNetworkTransport.requests;
    }

    /**
     * @returns An array of outstanding responses.
     */
    get responses() {
        return this.mockNetworkTransport.responses;
    }
}
