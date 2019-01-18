#!/usr/bin/env node

////////////////////////////////////////////////////////////////////////////
//
// Copyright 2016 Realm Inc.
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

// This script runs a command in every environment

const concurrently = require("concurrently");
const fs = require("fs");
const path = require("path");

const environments = fs
    .readdirSync(__dirname)
    .map(f => ({ name: f, path: path.resolve(__dirname, f) }))
    .filter(({ path }) => fs.statSync(path).isDirectory());

const command = process.argv.slice(2).join(" ");

concurrently(environments.map(e => ({
    command: `cd '${e.path}' && ${command}`,
    name: e.name,
})), {
    prefix: "name",
    killOthers: ["failure"]
}).then(undefined, err => process.exit(1));
