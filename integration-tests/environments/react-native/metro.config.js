////////////////////////////////////////////////////////////////////////////
//
// Copyright 2021 Realm Inc.
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

const path = require("path");
const fs = require("fs");
const exclusionList = require("metro-config/src/defaults/exclusionList");

// Read the localDependencies property of package.json and resolve the relative path values
const appPackageJson = readJson(__dirname, "package.json");
const localDependencies = Object.fromEntries(
  Object.entries(appPackageJson.localDependencies || {}).map(([localName, relativePath]) => [
    localName,
    path.resolve(__dirname, relativePath),
  ]),
);

function readJson(...pathSegemnts) {
  const filePath = path.join(...pathSegemnts);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

const watchFolders = Object.values(localDependencies);

// Block any node_module loaded from the local dependency, outside of the app's node_modules
const blockList = Object.values(localDependencies).map(
  (localPath) => new RegExp(`^${escape(path.join(localPath, "node_modules"))}\\/.*$`),
);

// Serves any module from the app's node_modules
const extraNodeModules = new Proxy(
  {},
  {
    get(target, name, receiver) {
      return path.resolve(__dirname, "node_modules", name);
    },
  },
);

module.exports = {
  projectRoot: __dirname,
  watchFolders,
  resolver: {
    blockList: exclusionList(blockList),
    extraNodeModules,
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        inlineRequires: true,
      },
    }),
  },
};
