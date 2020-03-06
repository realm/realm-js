import {
    DefaultNetworkTransport,
    NetworkTransport
} from "realm-network-transport";

import { create as createFunctionsFactory } from "./FunctionsFactory";
import { User } from "./User";

export interface AppConfiguration extends Realm.AppConfiguration {
    transport: NetworkTransport;
}

export class App<FF extends Realm.FunctionFactory> implements Realm.App {
    public readonly functions: FF;
    public readonly id: string;
    public readonly baseUrl: string;
    public readonly appUrl: string;
    public readonly baseRoute = "/api/client/v2.0";

    private static DEFAULT_BASE_URL = "https://stitch.mongodb.com";
    private readonly transport: NetworkTransport;

    constructor(id: string, configuration?: Partial<AppConfiguration>) {
        if (typeof id !== "string") {
            throw new Error("Missing a MongoDB Realm app-id");
        }
        this.id = id;
        this.baseUrl = configuration?.baseUrl || App.DEFAULT_BASE_URL;
        this.appUrl = `${this.baseUrl}${this.baseRoute}/app/${this.id}`;
        // Construct the fetcher
        this.transport =
            configuration?.transport || new DefaultNetworkTransport();
        // Construct the functions factory
        this.functions = createFunctionsFactory<FF>(
            this.transport,
            this.appUrl
        );
    }

    async login(credentials: Realm.Credentials): Promise<Realm.User> {
        // See https://github.com/mongodb/stitch-js-sdk/blob/310f0bd5af80f818cdfbc3caf1ae29ffa8e9c7cf/packages/core/sdk/src/auth/internal/CoreStitchAuth.ts#L746-L780
        const url = `${this.appUrl}/auth/providers/${credentials.providerName}/login`;
        const response = await this.transport.fetchAndParse({
            method: "POST",
            url,
            body: credentials.material
        });
        if (response.access_token && response.refresh_token) {
            return new User({
                app: this,
                accessToken: response.access_token,
                refreshToken: response.refresh_token
            });
        } else {
            throw new Error("Expected an access token in the response");
        }
    }
}
