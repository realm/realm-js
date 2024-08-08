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

/* eslint-disable no-restricted-globals */

Object.assign(globalThis, {
  title: "Node.js development-mode",
  environment: { node: true },
});

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
