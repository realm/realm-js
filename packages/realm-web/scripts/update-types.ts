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

import * as fs from "fs-extra";
import * as path from "path";

/* eslint-disable no-console */

const packagePath = path.resolve(__dirname, "..");
const packageTypesPath = path.resolve(packagePath, "types/realm");
const rootPath = path.resolve(packagePath, "../..");
const rootTypesPath = path.resolve(rootPath, "types");

// Delete any types already copied
console.log(`Deleting existing types (from ${packageTypesPath})`);
fs.removeSync(packageTypesPath);
// (Re-)create the directory
fs.copySync(rootTypesPath, packageTypesPath);
