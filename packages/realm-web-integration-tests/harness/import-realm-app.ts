import path from "path";

import { RealmAppImporter } from "realm-app-importer";

const MDB_REALM_BASE_URL =
    process.env.MDB_REALM_BASE_URL || "http://localhost:9090";
const MDB_REALM_USERNAME =
    process.env.MDB_REALM_USERNAME || "unique_user@domain.com";
const MDB_REALM_PASSWORD = process.env.MDB_REALM_PASSWORD || "password";

export async function importRealmApp() {
    // Create a new MongoDBRealmService
    const baseUrl = MDB_REALM_BASE_URL;
    const importer = new RealmAppImporter({
        baseUrl,
        username: MDB_REALM_USERNAME,
        password: MDB_REALM_PASSWORD,
        appsDirectoryPath: path.resolve(__dirname, "../imported-apps"),
        stitchConfigPath: path.resolve(__dirname, "../stitch-config.json"),
    });
    const appTemplatePath = path.resolve(__dirname, "../my-test-app-template");
    const { appId } = await importer.importApp(appTemplatePath);
    return { appId, baseUrl };
}
