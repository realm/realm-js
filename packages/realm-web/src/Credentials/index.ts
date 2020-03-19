import { Credentials } from "./Credentials";
import { UsernamePasswordCredentials } from "./UsernamePasswordCredentials";
import { AnonymousCredentials } from "./AnonymousCredentials";

// Setting the static class members of the Credentials base class here, to avoid a cyclic relationship.
Credentials.AnonymousCredentials = AnonymousCredentials;
Credentials.UsernamePasswordCredentials = UsernamePasswordCredentials;

export { Credentials, AnonymousCredentials, UsernamePasswordCredentials };
