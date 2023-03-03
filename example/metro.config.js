const config = require('@realm/metro-config')({projectRoot: __dirname});

// Prevent .js versions of files from being loaded in preference to TS
config.resolver.sourceExts = ['json', 'ts', 'tsx', 'js', 'jsx'];

module.exports = config;
