import type { App } from "./App";

interface UserParameters {
    app: App<any>;
    accessToken: string;
    refreshToken: string;
}

export class User implements Realm.User {
    public readonly app: App<any>;
    public readonly identities: Realm.UserIdentity[] = [];

    private _accessToken: string;
    private _refreshToken: string;

    public constructor({ app, accessToken, refreshToken }: UserParameters) {
        this.app = app;
        this._accessToken = accessToken;
        this._refreshToken = refreshToken;
    }

    get profile(): Realm.UserProfile {
        throw new Error("Not implemented");
    }

    get accessToken() {
        return this._accessToken;
    }
}
