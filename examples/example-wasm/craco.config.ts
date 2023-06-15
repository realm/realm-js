import * as path from "path";
import { getLoaders, loaderByName } from "@craco/craco";
import { CracoConfig } from "@craco/types";

const config: CracoConfig = {
  webpack: {
    configure(config, context) {
      const { hasFoundAny, matches } = getLoaders(
        config,
        loaderByName("babel-loader"),
      );
      console.assert(hasFoundAny);
      matches[0].loader!.include = [
        matches[0].loader!.include as string,
        path.resolve(__dirname, "../../packages"),
      ];

      config.experiments = {
        topLevelAwait: true,
        ...config.experiments,
      };

      return config;
    },
  },
  devServer: {
    open: "chrome",
  },
};

export default config;
