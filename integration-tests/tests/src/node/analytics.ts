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

import fse from "fs-extra";

type Fixture = "node" | "react-native" | "electron";

describe("Analytics", () => {
  function resolvePath(fixture: Fixture) {
    return path.resolve(__dirname, "fixtures", fixture);
  }

  function getRealmVersion() {
    const packageJsonPath = path.resolve(__dirname, "../../../../packages/realm/package.json");
    const packageJson = fse.readJsonSync(packageJsonPath);
    return packageJson["version"];
  }

  function expectCommon(data: Record<string, unknown>) {
    expect(data["JS Analytics Version"]).equals(3);
    expect(data.Binding).equals("Javascript");
    expect(data["Host OS Type"]).equals(os.platform());
    expect(data["Host OS Version"]).equals(os.release());
    expect(data["Node.js version"]).equals(process.version);
    expect(data["Realm Version"]).equals(getRealmVersion());
    expect(data.token).equals("ce0fac19508f6c8f20066d345d360fd0");
    expect(data["Anonymized Builder Id"]).is.not.undefined;
    expect(data["Core Version"]).is.not.undefined;
    expect((data["Core Version"] as string).match(/[0-9]+\.[0-9]+\.[0-9]+/)?.length).equal(1); // expect X.Y.Z
    expect(data["Installation Method"]).equals("npm"); // we run our tests with NPM
  }

  it("parses node.js package.json", async () => {
    const data = await collectPlatformData(resolvePath("node"));
    expectCommon(data);
    expect(data.Version).equals("1.2.3");
    expect(data.Framework).equals("node.js");
    expect(data["Framework Version"]).equals(process.version);
    expect(data["Runtime Engine"]).equals("v8");
    expect(data["Anonymized Bundle Id"]).equals("TfvqclDWR/+6sIPfZc73MetEj0DLskCtWXjWXXXIg6k=");
    expect(data.Language).equals("javascript");
    expect(data["Language Version"]).equals("unknown");
  });

  it("parses typescript/node package.json", async () => {
    const data = await collectPlatformData(resolvePath("ts-node"));
    expectCommon(data);
    expect(data.Version).equals("1.2.3");
    expect(data.Framework).equals("node.js");
    expect(data["Framework Version"]).equals(process.version);
    expect(data["Runtime Engine"]).equals("v8");
    expect(data["Anonymized Bundle Id"]).equals("ajQjGK7Tztb3WeVhmPitQFDRV24loZVttnXWSlXUjEc=");
    expect(data.Language).equals("typescript");
    expect(data["Language Version"]).equals("3.2.1");
  });

  it("parses electron package.json", async () => {
    const data = await collectPlatformData(resolvePath("electron"));
    expectCommon(data);
    expect(data.Version).equals("1.2.3");
    expect(data.Framework).equals("electron");
    expect(data["Framework Version"]).equals("1.0.1");
    expect(data["Runtime Engine"]).equals("v8");
    expect(data["Anonymized Bundle Id"]).equals("B4vmI2GL8s/WLRIvDt7ffHn1TeiJxNRzUPsgRfqhNOU=");
    expect(data.Language).equals("javascript");
    expect(data["Language Version"]).equals("unknown");
  });

  it("parses rn package.json", async () => {
    const data = await collectPlatformData(resolvePath("react-native"));
    expectCommon(data);
    expect(data.Version).equals("1.2.3");
    expect(data.Framework).equals("react-native");
    expect(data["Framework Version"]).equals("1.0.1");
    expect(data["Runtime Engine"]).equals("unknown");
    expect(data["Anonymized Bundle Id"]).equals("1RmJBlqbKuzyRiPm4AsdIIxe8xlRUntGcGFEwUnUh6A=");
    expect(data.Language).equals("javascript");
    expect(data["Language Version"]).equals("unknown");
  });
});
