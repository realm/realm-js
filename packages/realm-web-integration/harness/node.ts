import { importRealmApp } from "./import-realm-app";

// Reload the realm-web package when in --watch mode
for (const id in require.cache) {
    if (id.indexOf("/packages/realm-web/")) {
        delete require.cache[id];
    }
}

declare var global: { APP_ID: string; BASE_URL: string };

before(async function() {
    this.timeout(10000);
    // This enables app re-use when in --watch mode
    if (!global.APP_ID || !global.BASE_URL) {
        const { appId, baseUrl } = await importRealmApp();
        global.APP_ID = appId;
        global.BASE_URL = baseUrl;
    }
});
