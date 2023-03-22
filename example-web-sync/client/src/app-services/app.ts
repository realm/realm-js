import Realm from "realm";

import { appId } from "./config.json";

let app: Realm.App;
export function getApp(): Realm.App {
  if (!app) {
  app = new Realm.App({ id: appId/*, app: { version: "4" }*/ });
  }

  return app;
}
