import type { AnonymousCredentials } from "./AnonymousCredentials";
import type { UsernamePasswordCredentials } from "./UsernamePasswordCredentials";

/**
 * Abstract base class for credentials.
 * Exposes concrete types of credentials as static members and methods.
 */
export abstract class Credentials {
    // tslint:disable:completed-docs
    static AnonymousCredentials: typeof AnonymousCredentials;
    static UsernamePasswordCredentials: typeof UsernamePasswordCredentials;
    // tslint:endable:completed-docs

    /**
     * The name of the authentication provider used when authenticating
     */
    public readonly providerName: string;

    constructor(providerName: string) {
        this.providerName = providerName;
    }

    static anonymous(providerName?: string) {
        return new Credentials.AnonymousCredentials(providerName);
    }

    static usernamePassword(username: string, password: string, providerName?: string) {
        return new Credentials.UsernamePasswordCredentials(username, password, providerName);
    }
}
