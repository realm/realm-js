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

import { FunctionsFactory } from "../FunctionsFactory";

import { MockFetcher } from "./utils";

const DEFAULT_HEADERS = {
    Accept: "application/json",
    "Content-Type": "application/json",
};

describe("FunctionsFactory", () => {
    it("can be created", () => {
        const factory = FunctionsFactory.create({} as any);
        expect(factory).to.be.instanceOf(FunctionsFactory);
    });

    it("expose a callFunction method", () => {
        const factory = FunctionsFactory.create({} as any);
        expect(typeof factory.callFunction).equals("function");
    });

    it("expose an interface that allows calling any function", () => {
        const factory = FunctionsFactory.create({} as any);
        expect(typeof factory.anyFunction).equals("function");
    });

    it("calls the network transport correctly through callFunction", async () => {
        const fetcher = new MockFetcher([{ message: `hello friendly world!` }]);
        const factory = FunctionsFactory.create(fetcher, {
            serviceName: "custom-service",
        });
        const response = factory.callFunction("hello", "friendly");
        expect(response).to.be.instanceOf(Promise);
        const { message } = await response;
        expect(message).equals("hello friendly world!");
        expect(fetcher.requests).deep.equals([
            {
                url:
                    "http://localhost:1337/api/client/v2.0/app/mocked-app-id/functions/call",
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

    it("calls the network transport correctly via proxy", async () => {
        const fetcher = new MockFetcher([{ message: `hello friendly world!` }]);
        const factory = FunctionsFactory.create(fetcher, {
            serviceName: "custom-service",
        });
        const response = factory.hello("friendly");
        expect(response).to.be.instanceOf(Promise);
        const { message } = await response;
        expect(message).equals("hello friendly world!");
        expect(fetcher.requests).deep.equals([
            {
                url:
                    "http://localhost:1337/api/client/v2.0/app/mocked-app-id/functions/call",
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
