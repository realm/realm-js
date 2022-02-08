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
import { readJsonSync } from "fs-extra";

describe("Analytics", () => {
  function getRealmVersion() {
    const rootPath = ["..", "..", "..", "..", "package.json"].join(path.sep);
    const realmPackageJson = readJsonSync(rootPath);
    return realmPackageJson["version"];
  }

  it("returns the expected version", async () => {
    const packageJson = { version: "1.2.3" };
    const data = await collectPlatformData(packageJson);

    // common to all cases
    expect(data["JS Analytics Version"]).equals(2);
    expect(data.Binding).equals("javascript");
    expect(data.Language).equals("javascript");
    expect(data["Host OS Type"]).equals(os.platform());
    expect(data["Host OS Version"]).equals(os.release());
    expect(data["Node.js version"]).equals(process.version);
    expect(data.token).equals("aab85907a13e1ff44a95be539d9942a9");

    // specific to package.json
    expect(data.Version).equals("1.2.3");
  });

  it("parses node.js package.json", async () => {
    console.log(`FISK: ${process.cwd}`);
    const packageJson = readJsonSync("./node-package.json");

    const data = await collectPlatformData(packageJson);
    expect(data.Version).equals("1.11.1");
    expect(data.Framework).equals("node.js");
    expect(data["Framework Version"]).equals(process.version);
    expect(data["JavaScript Engine"]).equals("v8");
    expect(data["Realm Version"]).equals(getRealmVersion());
  });

  it("parses electron package.json", async () => {
    const packageJson = readJsonSync("./electron-package.json");

    const data = await collectPlatformData(packageJson);
    expect(data.Version).equals("11.1.1");
    expect(data.Framework).equals("electron");
    expect(data["Framework Version"]).equals("^16.0.4");
    expect(data["JavaScript Engine"]).equals("v8");
    expect(data["Realm Version"]).equals(getRealmVersion());
  });

  it("parses rn package.json", async () => {
    const packageJson = readJsonSync("./rn-package.json");

    const data = await collectPlatformData(packageJson);
    expect(data.Version).equals("11.1.1");
    expect(data.Framework).equals("react-native");
    expect(data["Framework Version"]).equals("0.64.2");
    expect(data["JavaScript Engine"]).equals("unknown");
    expect(data["Realm Version"]).equals(getRealmVersion());
  });
});
