import type { AnonymousCredentials } from "./AnonymousCredentials";
import type { EmailPasswordCredentials } from "./EmailPasswordCredentials";

/**
 * Abstract base class for credentials.
 * Exposes the Credentials namespace: Concrete types of credentials as static members and methods.
 */
export abstract class Credentials {
    /** @static */
    static AnonymousCredentials: typeof AnonymousCredentials;
    /** @static */
    static EmailPasswordCredentials: typeof EmailPasswordCredentials;

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
     * @returns The newly created credentials.
     */
    static anonymous(providerName?: string) {
        return new Credentials.AnonymousCredentials(providerName);
    }

    /**
     * Create email / password credentials.
     *
     * @param email The end-users email.
     * @param password The end-users password.
     * @param providerName Optional custom name of the authentication provider.
     * @returns The newly created credentials.
     */
    static emailPassword(
        email: string,
        password: string,
        providerName?: string,
    ) {
        return new Credentials.EmailPasswordCredentials(
            email,
            password,
            providerName,
        );
    }
}
