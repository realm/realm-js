import type { AnonymousCredentials } from "./AnonymousCredentials";
import type { UsernamePasswordCredentials } from "./UsernamePasswordCredentials";

/**
 * Abstract base class for credentials.
 * Exposes the Credentials namespace: Concrete types of credentials as static members and methods.
 */
export abstract class Credentials {
    /** @static */
    static AnonymousCredentials: typeof AnonymousCredentials;
    /** @static */
    static UsernamePasswordCredentials: typeof UsernamePasswordCredentials;

    /**
     * The name of the authentication provider used when authenticating
     */
    public readonly providerName: string;

    /**
     * Construct a set of credentials
     *
     * @param providerName Optional custom name of the authentication provider.
     */
    constructor(providerName: string) {
        this.providerName = providerName;
    }

    /**
     * Create anonymous credentials.
     *
     * @param providerName Optional custom name of the authentication provider.
     * @returns A new instance of anonymous credentials.
     */
    static anonymous(providerName?: string) {
        return new Credentials.AnonymousCredentials(providerName);
    }

    /**
     * Create username / password credentials.
     *
     * @param username The end-users username.
     * @param password The end-users password.
     * @param providerName Optional custom name of the authentication provider.
     * @returns A new instance of username / password credentials.
     */
    static usernamePassword(
        username: string,
        password: string,
        providerName?: string,
    ) {
        return new Credentials.UsernamePasswordCredentials(
            username,
            password,
            providerName,
        );
    }
}
