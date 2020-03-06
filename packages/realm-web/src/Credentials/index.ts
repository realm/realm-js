import { Credentials } from "./Credentials";
import { UsernamePasswordCredentials } from "./UsernamePasswordCredentials";
import { AnonymousCredentials } from "./AnonymousCredentials";

Credentials.AnonymousCredentials = AnonymousCredentials;
Credentials.UsernamePasswordCredentials = UsernamePasswordCredentials;

export { Credentials, AnonymousCredentials, UsernamePasswordCredentials };
