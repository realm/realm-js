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

// Metro bundler does not support symlinks (see https://github.com/facebook/metro/issues/1).
// In order to link to our local version of Realm JS in a way which Metro can follow,
// we need to instead add the module to `resolver.blockList`, and then in `resolver.extraNodeModules`,
// override the locations for any symlinked modules by specifying a mapping from their name
// to their actual location on disk.

// In order to achieve this, we recursively check if each file/directory in `node_modules`
// is a symlink or not. If it is, and if it is specified in our main `package.json` (i.e.
// it is a direct dependency of our app), we add it to the `blockList` and
// add a mapping for it. We also add it to the list of watched folders, so
// that any changes to it are picked up by hot reloading.

const path = require("path");
const fs = require("fs");
const exclusionList = require("metro-config/src/defaults/exclusionList");

function readJson(...pathSegemnts) {
  const filePath = path.join(...pathSegemnts);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function getLinkedDependencies(packagePath, exclude = new Set()) {
  const packageJson = readJson(packagePath, "package.json");
  const nodeModulesPath = path.join(packagePath, "node_modules");
  const files = fs.readdirSync(nodeModulesPath, { encoding: "utf8", withFileTypes: true });
  const links = files
    .filter((f) => f.isSymbolicLink())
    .map(({ name }) => {
      const linkPath = fs.realpathSync(path.join(nodeModulesPath, name));
      const linkPackageJson = readJson(linkPath, "package.json");
      const peerDependencies = Object.keys(linkPackageJson.peerDependencies || {});
      return { name, path: linkPath, peerDependencies };
    });
  // We're only interested in actual dependencies
  const dependencyLinks = links.filter(({ name }) => name in packageJson.dependencies && !exclude.has(name));
  // Recurse
  // Ensure we don't visit this package again
  exclude.add(packageJson.name);
  // Traverse all dependencies
  for (const link of dependencyLinks) {
    const additionalLinks = getLinkedDependencies(link.path, exclude);
    dependencyLinks.push(...additionalLinks);
  }
  // Return only new links
  return dependencyLinks;
}

const linkedDependencies = getLinkedDependencies(__dirname);
console.log(`Linked dependencies: ${linkedDependencies.map(({ name }) => name).join(", ")}`);

const watchFolders = linkedDependencies.map((pkg) => pkg.path);

const blockedPaths = [];
for (const pkg of linkedDependencies) {
  // Block the links
  blockedPaths.push(path.join(__dirname, "node_modules", pkg.name));
  // Block any peer dependencies of the links
  blockedPaths.push(...pkg.peerDependencies.map((peer) => path.join(pkg.path, "node_modules", peer)));
}
// Turn paths into regular expressions
const blockList = blockedPaths.map((pkgPath) => new RegExp(`^${escape(pkgPath)}\\/.*$`));

const peerNodeModules = {};
const allPeerDependencies = linkedDependencies.flatMap((pkg) => pkg.peerDependencies);
const unresolvedPeerDependencies = new Set(allPeerDependencies.filter((name) => !(name in linkedDependencies)));
// Locate the package providing every unresolved peer dependency
for (const peer of unresolvedPeerDependencies) {
  for (const pkg of linkedDependencies) {
    const potentialPath = path.join(pkg.path, "node_modules", peer);
    if (fs.existsSync(potentialPath)) {
      peerNodeModules[peer] = potentialPath;
      break;
    }
  }
}
// Create a proxy around the resolved peer dependencies
// This will resolve all modules exposed by the react-native app and fall back to resolved peer dependencies
const extraNodeModules = new Proxy(peerNodeModules, {
  get(target, name, receiver) {
    const potentialPath = path.join(__dirname, "node_modules", name);
    if (fs.existsSync(potentialPath)) {
      return potentialPath;
    } else if (name in target) {
      return target[name];
    } else {
      return undefined;
    }
  },
});

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
