import { App } from "./App";

const appCache: { [id: string]: Realm.App } = {};

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
const AppConstructor = App as Realm.AppConstructor;
export { AppConstructor as App };

export { Credentials } from "./Credentials/index";
export { User } from "./User";
