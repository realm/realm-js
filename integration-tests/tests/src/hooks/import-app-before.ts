import { importApp, TemplateReplacements } from "../utils/import-app";

export function importAppBefore(name: string, replacements: TemplateReplacements = {}, logLevel: Realm.App.Sync.LogLevel = "warn") {
  before(async function(this: Partial<AppContext> & Mocha.Context) {
    this.timeout(10000);
    if (this.app) {
      throw new Error("Unexpected app on context, use only one importAppBefore per test");
    } else {
      this.app = await importApp(name, replacements);
      Realm.App.Sync.setLogLevel(this.app, logLevel);
    }
  });
}