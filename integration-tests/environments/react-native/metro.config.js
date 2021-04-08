/**
 * Metro configuration for React Native
 * https://github.com/facebook/react-native
 *
 * @format
 */

const path = require("path");
const fs = require("fs");
const exclusionList = require("metro-config/src/defaults/exclusionList");

// Read the localDependencies property of package.json and resolve the relative path values
const appPackageJson = readJson(__dirname, "package.json");
const localDependencies = Object.fromEntries(
    Object.entries(
        appPackageJson.localDependencies || {},
    ).map(([localName, relativePath]) => [
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
    localPath =>
        new RegExp(`^${escape(path.join(localPath, "node_modules"))}\\/.*$`),
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
                experimentalImportSupport: false,
                inlineRequires: true,
            },
        }),
    },
};
