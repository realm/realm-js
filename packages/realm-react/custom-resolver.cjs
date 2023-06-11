////////////////////////////////////////////////////////////////////////////
//
// Copyright 2023 Realm Inc.
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

/* eslint-env node */

module.exports = function (request, options) {
  if (request === "react-native") {
    // Ensure that "react-native" always resolve relative to the rootDir
    options.basedir = options.rootDir;
  } else if (request === "@realm/binding") {
    // Ensure the node binding is used when testing with Jest on node
    options.conditions = ["require", "default", "node"];
  }
  return options.defaultResolver(request, options);
};
