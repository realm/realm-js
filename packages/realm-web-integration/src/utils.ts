import { App } from "realm-web";

// This global is injected by WebPack
declare const APP_ID: string;

export function createApp<FF extends Realm.FunctionsFactory>() {
    return new App<FF>(APP_ID, {
        baseUrl: "http://localhost:8080"
    });
}
