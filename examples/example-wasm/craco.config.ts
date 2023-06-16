////////////////////////////////////////////////////////////////////////////
//
// Copyright 2023 Realm Inc.
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
