import { App } from "realm";

import { appId } from "./config.json";

let app: App;
export function getApp(): App {
  if (!app) {
    app = new App({ id: appId });
  }

  return app;
}
