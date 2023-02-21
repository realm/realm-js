const config = require('@realm/metro-config')(__dirname);

// Prevent .js versions of files from being loaded in preference to TS
config.resolver.sourceExts = ['json', 'ts', 'tsx', 'js', 'jsx'];

module.exports = {
	transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
	...config};
