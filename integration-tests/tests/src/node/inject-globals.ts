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

// Set the defult depth of objects logged with console.log to improve DX when debugging
import { inspect } from "node:util";
inspect.defaultOptions.depth = null;

if (!global.gc) {
  throw new Error("Run with --expose_gc to allow garbage collection between tests");
}

// Require this file to get the Realm constructor injected into the global.
// This is only useful when we want to run the tests outside of any particular environment

import { existsSync } from "node:fs";
global.fs = {
  exists(path) {
    return existsSync(path);
  },
};

import { dirname, resolve } from "path";
global.path = {
  dirname(path) {
    return dirname(path);
  },
  resolve(...paths: string[]) {
    return resolve(...paths);
  },
};

global.title = "Realm JS development-mode";
global.environment = { node: true };

function parseValue(value: string | undefined) {
  if (typeof value === "undefined" || value === "true") {
    return true;
  } else if (value === "false") {
    return false;
  } else {
    return value;
  }
}

const { CONTEXT } = process.env;
if (CONTEXT) {
  for (const pair of CONTEXT.split(",")) {
    const [key, value] = pair.split("=");
    if (key) {
      environment[key] = parseValue(value);
    }
  }
}
