import Realm from "realm";

import { ATLAS_APP_ID } from "./config";
import { logger } from "../logger";

let app: Realm.App | null = null;

export const getAtlasApp = function getAtlasApp() {
  if (!app) {
    app = new Realm.App({ id: ATLAS_APP_ID });

    // Using log level "all", "trace", or "debug" is good for debugging during developing.
    // Lower log levels are recommended in production for performance improvement.
    // logLevels = ["all", "trace", "debug", "detail", "info", "warn", "error", "fatal", "off"];
    // You may import `NumericLogLevel` to get them as numbers starting from 0 (`all`).
    Realm.setLogLevel("all");
    Realm.setLogger((logLevel, message) => {
      logger.info(`Log level: ${logLevel} - Log message: ${message}`);
    });
  }

  return app;
};
