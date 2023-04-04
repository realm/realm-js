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

import * as os from "os";
import * as process from "process";
import * as path from "path";
import { expect } from "chai";
import { collectPlatformData } from "realm/scripts/submit-analytics";
import { readFileSync } from "node:fs";

type Fixture = "node" | "react-native" | "electron";

// TODO: Update this to use ESM friendly APIs
describe.skip("Analytics", () => {
  function resolvePath(fixture: Fixture) {
    return path.resolve(__dirname, "fixtures", fixture);
  }

  function getRealmVersion() {
    const realmPath = path.resolve(__dirname, "../../../../package.json");
    const realmPackageContent = readFileSync(realmPath, { encoding: "utf8" });
    const realmPackageJson = JSON.parse(realmPackageContent);
    return realmPackageJson["version"];
  }

  function expectCommon(data: Record<string, unknown>) {
    expect(data["JS Analytics Version"]).equals(2);
    expect(data.Binding).equals("javascript");
    expect(data.Language).equals("javascript");
    expect(data["Host OS Type"]).equals(os.platform());
    expect(data["Host OS Version"]).equals(os.release());
    expect(data["Node.js version"]).equals(process.version);
    expect(data["Realm Version"]).equals(getRealmVersion());
    expect(data.token).equals("ce0fac19508f6c8f20066d345d360fd0");
  }

  it("parses node.js package.json", async () => {
    const data = await collectPlatformData(resolvePath("node"));
    expectCommon(data);
    expect(data.Version).equals("1.2.3");
    expect(data.Framework).equals("node.js");
    expect(data["Framework Version"]).equals(process.version);
    expect(data["JavaScript Engine"]).equals("v8");
  });

  it("parses electron package.json", async () => {
    const data = await collectPlatformData(resolvePath("electron"));
    expectCommon(data);
    expect(data.Version).equals("1.2.3");
    expect(data.Framework).equals("electron");
    expect(data["Framework Version"]).equals("1.0.1");
    expect(data["JavaScript Engine"]).equals("v8");
  });

  it("parses rn package.json", async () => {
    const data = await collectPlatformData(resolvePath("react-native"));
    expectCommon(data);
    expect(data.Version).equals("1.2.3");
    expect(data.Framework).equals("react-native");
    expect(data["Framework Version"]).equals("1.0.1");
    expect(data["JavaScript Engine"]).equals("unknown");
  });
});
