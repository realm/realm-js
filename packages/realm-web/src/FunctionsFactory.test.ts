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

import {
    create as createFunctionsFactory,
    FunctionsFactory,
} from "./FunctionsFactory";
import { MockTransport } from "./test/MockTransport";

const DEFAULT_HEADERS = {
    Accept: "application/json",
    "Content-Type": "application/json",
};

describe("FunctionsFactory", () => {
    it("can be created", () => {
        const factory = createFunctionsFactory({} as any);
        expect(factory).to.be.instanceOf(FunctionsFactory);
    });

    it("expose a callFunction method", () => {
        const factory = createFunctionsFactory({} as any);
        expect(typeof factory.callFunction).equals("function");
    });

    it("expose an interface that allows calling any function", () => {
        const factory = createFunctionsFactory({} as any);
        expect(typeof factory.anyFunction).equals("function");
    });

    it("calls the network transport correctly", async () => {
        const transport = new MockTransport([
            { message: `hello friendly world!` },
        ]);
        const factory = createFunctionsFactory(transport, {
            serviceName: "custom-service",
        });
        const response = factory.hello("friendly");
        expect(response).to.be.instanceOf(Promise);
        const { message } = await response;
        expect(message).to.equal("hello friendly world!");
        expect(transport.requests).deep.equals([
            {
                url: "http://localhost:1337/functions/call",
                method: "POST",
                body: {
                    name: "hello",
                    service: "custom-service",
                    arguments: ["friendly"],
                },
                headers: DEFAULT_HEADERS,
            },
        ]);
    });
});
