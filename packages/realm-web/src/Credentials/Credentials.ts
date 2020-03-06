import type { AnonymousCredentials } from "./AnonymousCredentials";
import type { UsernamePasswordCredentials } from "./UsernamePasswordCredentials";

export abstract class Credentials {
    static AnonymousCredentials: typeof AnonymousCredentials;
    static UsernamePasswordCredentials: typeof UsernamePasswordCredentials;

    static anonymous() {
        return new Credentials.AnonymousCredentials();
    }

    static usernamePassword(username: string, password: string) {
        return new Credentials.UsernamePasswordCredentials(username, password);
    }
}
