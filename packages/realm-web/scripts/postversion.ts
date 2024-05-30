////////////////////////////////////////////////////////////////////////////
//
// Copyright 2024 Realm Inc.
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

import fs from "node:fs";
import path from "node:path";

const version = process.env.npm_package_version as string;
if (typeof version !== "string") {
  throw new Error("Failed to determine package version");
}

const readmePath = path.resolve(__dirname, "../README.md");

// Update the readme file to use the new version in the script-tag.
const readmeContent = fs.readFileSync(readmePath, "utf8");
const readmeContentReplaced = readmeContent.replace(/realm-web@[^"/]+/, `realm-web@${version}`);
fs.writeFileSync(readmePath, readmeContentReplaced);
