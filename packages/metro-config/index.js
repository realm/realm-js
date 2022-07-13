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

const { DEBUG_METRO_CONFIG } = process.env;

function readJson(...pathSegments) {
  const filePath = path.join(...pathSegments);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function getLinkedDependencies(packagePath, exclude = new Set()) {
  const packageJson = readJson(packagePath, "package.json");
  const nodeModulesPath = path.join(packagePath, "node_modules");
  const files = fs.readdirSync(nodeModulesPath, { encoding: "utf8", withFileTypes: true });
  // Symbolically linked packages directly in the node_modules directory.
  const directLinks = files
    .filter((f) => f.isSymbolicLink())
    .map(({ name }) => ({ name, path: fs.realpathSync(path.join(nodeModulesPath, name)) }));
  // Symbolically linked packages within an "@" scoped directory
  const scopedLinks = files
    .filter((f) => f.name.startsWith("@"))
    .map((parent) => {
      const parentPath = path.join(nodeModulesPath, parent.name);
      const children = fs.readdirSync(parentPath, { encoding: "utf8", withFileTypes: true });
      return children
        .filter((f) => f.isSymbolicLink())
        .map(({ name }) => ({
          name: parent.name + "/" + name,
          path: fs.realpathSync(path.join(parentPath, name)),
        }));
    })
    .flat();
  const combinedLinks = [...directLinks, ...scopedLinks];
  const links = combinedLinks.map(({ name, path: linkPath }) => {
    const linkPackageJson = readJson(linkPath, "package.json");
    const devDependencies = Object.keys(linkPackageJson.devDependencies || {});
    const peerDependencies = Object.keys(linkPackageJson.peerDependencies || {});
    return { name, path: linkPath, peerDependencies, devDependencies };
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

function build(projectRoot, moreExtraNodeModules = {}) {
  const rootPackageJson = readJson(projectRoot, "package.json");
  const linkedDependencies = getLinkedDependencies(projectRoot);
  console.log(`Linked dependencies: ${linkedDependencies.map(({ name }) => name).join(", ")}`);

  const watchFolders = linkedDependencies.map((pkg) => pkg.path);

  const blockedPaths = [];
  for (const pkg of linkedDependencies) {
    // Block the links
    blockedPaths.push(path.join(projectRoot, "node_modules", pkg.name));
    // Block any peer dependencies of the links
    blockedPaths.push(...pkg.peerDependencies.map((peer) => path.join(pkg.path, "node_modules", peer)));
    // Block any dependency provided by the root
    // NOTE: This is a bit too aggressive, since the link dep's dependency might mismatch in version
    const rootDependencyNames = Object.keys(rootPackageJson.dependencies);
    blockedPaths.push(...rootDependencyNames.map((dep) => path.join(pkg.path, "node_modules", dep)));
  }

  // Turn paths into regular expressions
  const blockList = blockedPaths.map((pkgPath) => new RegExp(`^${escape(pkgPath)}\\/.*$`));

  const extraNodeModulesBase = {
    ...moreExtraNodeModules,
  };
  const allPeerDependencies = linkedDependencies.flatMap((pkg) => pkg.peerDependencies);
  const unresolvedPeerDependencies = new Set(allPeerDependencies.filter((name) => !(name in linkedDependencies)));
  // Locate the package providing every unresolved peer dependency
  for (const peer of unresolvedPeerDependencies) {
    for (const pkg of linkedDependencies) {
      const potentialPath = path.join(pkg.path, "node_modules", peer);
      if (fs.existsSync(potentialPath)) {
        extraNodeModulesBase[peer] = potentialPath;
        break;
      }
    }
  }
  // Create a proxy around the resolved peer dependencies
  // This will resolve all modules exposed by the react-native app and fall back to resolved peer dependencies
  const extraNodeModules = new Proxy(extraNodeModulesBase, {
    get(target, name) {
      const candidatePaths = [];
      const potentialPath = path.join(projectRoot, "node_modules", name);
      if (fs.existsSync(potentialPath)) {
        candidatePaths.push(potentialPath);
      }
      if (name in target) {
        candidatePaths.push(target[name]);
      }
      // Try resolving this from the linked dependencies
      const linkedDependencyDependencies = linkedDependencies
        // Skipping packages that are devDependencies, since they shouldn't be relied on
        .filter((pkg) => !pkg.devDependencies.includes(name))
        .map((pkg) => path.join(pkg.path, "node_modules", name))
        .filter(fs.existsSync);
      candidatePaths.push(...linkedDependencyDependencies);

      if (candidatePaths.length === 1) {
        return candidatePaths[0];
      } else if (candidatePaths.length > 1) {
        if (DEBUG_METRO_CONFIG) {
          console.warn(`Found multiple '${name}' packages via linked dependencies:`);
          for (const i in candidatePaths) {
            console.warn(`- ${candidatePaths[i]}`, i === 0 ? " (returning this)" : "");
          }
        }
        return candidatePaths[0];
      } else {
        console.error("Failed to resolve", name);
        return undefined;
      }
    },
  });

  return {
    projectRoot,
    watchFolders,
    resolver: {
      blockList: exclusionList(blockList),
      extraNodeModules,
    },
    transformer: {
      getTransformOptions: async () => ({
        transform: {
          inlineRequires: false,
        },
      }),
    },
  };
}

module.exports = build;
