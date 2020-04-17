import { Credentials } from "./Credentials";
import { EmailPasswordCredentials } from "./EmailPasswordCredentials";
import { AnonymousCredentials } from "./AnonymousCredentials";

// Setting the static class members of the Credentials base class here, to avoid a cyclic relationship.
Credentials.AnonymousCredentials = AnonymousCredentials;
Credentials.EmailPasswordCredentials = EmailPasswordCredentials;

export { Credentials, AnonymousCredentials, EmailPasswordCredentials };
