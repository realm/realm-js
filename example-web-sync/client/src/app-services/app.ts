import { App } from "realm";

import config from "./config.json";

const { appId } = config;
let app: App;
export function getApp(): App {
  if (!app) {
    app = new App({ id: appId });
  }

  return app;
}
