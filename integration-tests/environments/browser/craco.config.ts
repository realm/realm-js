import { CracoConfig } from "@craco/types";
import {
    loaderByName,
    getLoaders,
    removePlugins,
    pluginByName
  } from "@craco/craco";
import * as path from "path";
import NodePolyfillPlugin from "node-polyfill-webpack-plugin";

const config: CracoConfig = {
    babel: {
        presets: [
            ["@babel/preset-typescript", {
                allowDeclareFields: true
            }]
        ]
    },
    webpack: {
        configure(config, context) {
            const { hasFoundAny, matches } = getLoaders(
                config,
                loaderByName('babel-loader')
            );
            console.assert(hasFoundAny);
            matches[0].loader!.include = [
                matches[0].loader!.include as string,
                path.resolve(__dirname, '../../tests/src'),
                path.resolve(__dirname, '../../../packages')
            ];

            // needed to import source-map-support
            if (config.resolve!.plugins) {
                config.resolve!.plugins.pop();
            }
            config.plugins = [
                ...config.plugins || [],
                new NodePolyfillPlugin()
            ];

            config.experiments = {
                topLevelAwait: true,
                ...config.experiments
            };
            return config;
        },
    },
    devServer: {
        open: "chrome",
    }
};
export default config;