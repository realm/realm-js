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
import { ObjectId } from "bson";

import { DeviceInformation } from "../DeviceInformation";

describe("DeviceInformation", () => {
    it("it can be constructed from almost nothing", () => {
        const info = new DeviceInformation({});
        expect(info).deep.equals({
            platform: "node",
            platformVersion: process.versions.node,
            sdkVersion: "0.0.0-test", // Mocked version injected by env.js
            appId: undefined,
            appVersion: undefined,
            deviceId: undefined,
        });
    });

    it("it can be constructed with app id, version and device id", () => {
        const deviceId = new ObjectId("000000000000000000001337");
        const info = new DeviceInformation({
            appId: "my-app",
            appVersion: "0.0.0-app-test",
            deviceId,
        });
        expect(info).deep.equals({
            appId: "my-app",
            appVersion: "0.0.0-app-test",
            // Other values
            platform: "node",
            platformVersion: process.versions.node,
            sdkVersion: "0.0.0-test", // Mocked version injected by env.js
            deviceId,
        });
    });
});
