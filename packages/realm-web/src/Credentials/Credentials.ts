import type { AnonymousCredentials } from "./AnonymousCredentials";
import type { UsernamePasswordCredentials } from "./UsernamePasswordCredentials";

export abstract class Credentials {
    static AnonymousCredentials: typeof AnonymousCredentials;
    static UsernamePasswordCredentials: typeof UsernamePasswordCredentials;

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
