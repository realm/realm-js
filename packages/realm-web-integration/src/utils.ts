import { App } from "realm-web";

// This global is injected by WebPack
declare const APP_ID: string;
declare const BASE_URL: string;

export function createApp<
    FunctionsFactoryType extends Realm.FunctionsFactory
>() {
    if (typeof APP_ID !== "string") {
        throw new Error("Expected a global APP_ID");
    }
    if (typeof BASE_URL !== "string") {
        throw new Error("Expected a global BASE_URL");
    }
    return new App<FunctionsFactoryType>({
        id: APP_ID,
        baseUrl: BASE_URL
    });
}
