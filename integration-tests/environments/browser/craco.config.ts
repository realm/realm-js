import { CracoConfig } from "@craco/types";
import craco from "@craco/craco";

const config: CracoConfig = {
    babel: {
        presets: [
            "@babel/preset-typescript"
        ]
    },
    webpack: {
        configure(config, context) {
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