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

const fs = require("node:fs");
const path = require("node:path");

function extractRelease(changelog, expectedVersion) {
  // Inspired by https://github.com/realm/ci-actions/blob/main/update-changelog/src/helpers.ts
  const changelogRegex = /^## (?<version>[^\s]+) \((?<date>[^)]+)\)\s+(?<body>.*?)\s+(?=^## )/gms;
  let match;
  while ((match = changelogRegex.exec(changelog))) {
    const release = match.groups;
    if (!expectedVersion || expectedVersion === release.version) {
      return release;
    }
  }
  throw new Error("Unable to extract release");
}

if (require.main === module) {
  const changelogPath = path.resolve(__dirname, process.argv[3] || "../CHANGELOG.md");
  const changelog = fs.readFileSync(changelogPath, { encoding: "utf8" });
  const version = process.argv[2];
  const release = extractRelease(changelog, version);
  console.log(release.body);
}
