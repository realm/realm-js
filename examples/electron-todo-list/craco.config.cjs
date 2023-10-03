
const path = require("node:path");
const nodeExternals = require("webpack-node-externals");

module.exports = {
  webpack: {
    configure: {
      target: "electron-renderer",
      externals: [
        nodeExternals({
          allowlist: [/webpack(\/.*)?/, "electron-devtools-installer"],
          additionalModuleDirs: [path.resolve(__dirname, '../../node_modules')],
        }),
      ],
    },
  },
};
