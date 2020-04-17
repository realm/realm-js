import { App } from "./App";

const appCache: { [id: string]: Realm.App } = {};

/**
 * Get or create a Realm App from an id.
 *
 * @param id The Realm App id visible from the MongoDB Realm UI or a configuration
 * @returns The Realm App instance. Calling this function multiple times with the same id will return the same instance.
 */
export function app(id: string) {
    if (id in appCache) {
        return appCache[id];
    } else {
        const instance = new App(id);
        appCache[id] = instance;
        return instance;
    }
}

// Ensure the App has the correct constructor type signature
/**
 * The constructor of MongoDB Realm App.
 */
const AppConstructor = App as Realm.AppConstructor;
export { AppConstructor as App };

export { Credentials } from "./credentials";
export { User } from "./User";
