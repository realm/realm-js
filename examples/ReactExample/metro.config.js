/**
 * Metro configuration for React Native
 * https://github.com/facebook/react-native
 *
 * @format
 */

const blacklist = require('metro-config/src/defaults/blacklist');

module.exports = {
    resolver: {
        // Work-around for a ton of circular dependencies when building the examples
        // See metro bug: https://github.com/facebook/metro/issues/265#issuecomment-446636417
        // Only works if checked out folder is named realm-js
        blacklistRE: blacklist([/realm-js\/react-native\/.*/, /ReactExample\/node_modules\/realm\/react-native\/node_modules\/react-native\/.*/]),
    },
    transformer: {
        getTransformOptions: async () => ({
            transform: {
                experimentalImportSupport: false,
                inlineRequires: false,
            },
        }),
    },
};

