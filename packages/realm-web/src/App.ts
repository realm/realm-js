import {
    DefaultNetworkTransport,
    NetworkTransport
} from "realm-network-transport";

import { create as createFunctionsFactory } from "./FunctionsFactory";
import { User } from "./User";
import { AuthenticatedNetworkTransport } from "./AuthenticatedNetworkTransport";

export interface AppConfiguration extends Realm.AppConfiguration {
    transport: NetworkTransport;
}

export class App<FF extends Realm.FunctionsFactory> implements Realm.App {
    public readonly functions: FF;
    public readonly id: string;
    public readonly baseUrl: string;
    public readonly appUrl: string;
    public readonly baseRoute = "/api/client/v2.0";

    private static DEFAULT_BASE_URL = "https://stitch.mongodb.com";
    private readonly transport: AuthenticatedNetworkTransport;

    constructor(id: string, configuration?: Partial<AppConfiguration>) {
        if (typeof id !== "string") {
            throw new Error("Missing a MongoDB Realm app-id");
        }
        this.id = id;
        this.baseUrl = configuration?.baseUrl || App.DEFAULT_BASE_URL;
        this.appUrl = `${this.baseUrl}${this.baseRoute}/app/${this.id}`;
        // Construct the fetcher
        const pureTransport =
            configuration?.transport || new DefaultNetworkTransport();
        this.transport = new AuthenticatedNetworkTransport(pureTransport);
        // Construct the functions factory
        this.functions = createFunctionsFactory<FF>(
            this.transport,
            this.appUrl
        );
    }

    async logIn(credentials: Realm.Credentials): Promise<Realm.User> {
        // See https://github.com/mongodb/stitch-js-sdk/blob/310f0bd5af80f818cdfbc3caf1ae29ffa8e9c7cf/packages/core/sdk/src/auth/internal/CoreStitchAuth.ts#L746-L780
        const url = `${this.appUrl}/auth/providers/${credentials.providerName}/login`;
        const response = await this.transport.fetchUnauthenticated({
            method: "POST",
            url,
            body: credentials.material
        });
        if (response.access_token && response.refresh_token) {
            const user = new User({
                app: this,
                accessToken: response.access_token,
                refreshToken: response.refresh_token
            });
            // Tell the authenticated network transport about this new user
            this.transport.switchUser(user);
            // Return the user to the caller
            return user;
        } else {
            throw new Error("Expected an access token in the response");
        }
    }

    get currentUser(): Readonly<Realm.User> | null {
        return this.transport.currentUser;
    }

    get allUsers(): Readonly<Realm.User[]> {
        return this.transport.getAllUsers();
    }
}
