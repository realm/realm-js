import { NetworkTransport, Request } from "realm-network-transport";

export class AuthenticatedNetworkTransport {
    private transport: NetworkTransport;
    private allUsers: Readonly<Realm.User>[] = [];

    public constructor(transport: NetworkTransport) {
        this.transport = transport;
    }

    public fetchUnauthenticated<
        RequestBody extends any,
        ResponseBody extends any
    >(request: Request<RequestBody>): Promise<ResponseBody> {
        return this.transport.fetchAndParse(request);
    }

    public fetchAuthenticated<
        RequestBody extends any,
        ResponseBody extends any
    >(request: Request<RequestBody>): Promise<ResponseBody> {
        return this.transport.fetchAndParse({
            ...request,
            headers: {
                ...request.headers,
                ...this.buildAuthorizationHeader()
            }
        });
    }

    public switchUser(user: Realm.User) {
        const index = this.allUsers.indexOf(user);
        if (index >= 0) {
            this.allUsers.splice(index, 1);
        }
        // Push the user to the top of the stack
        this.allUsers.push(user);
    }

    public forgetUser(user: Realm.User) {
        const index = this.allUsers.indexOf(user);
        this.allUsers.splice(index, 1);
    }

    public get currentUser(): Realm.User | null {
        if (this.allUsers.length === 0) {
            return null;
        } else {
            // Current user is the top of the stack
            return this.allUsers[this.allUsers.length - 1];
        }
    }

    public getAllUsers(): readonly Realm.User[] {
        return Object.freeze(this.allUsers);
    }

    private buildAuthorizationHeader() {
        const currentUser = this.currentUser;
        if (currentUser) {
            // TODO: Ensure the access token is valid
            return {
                Authorization: `Bearer ${currentUser.accessToken}`
            };
        } else {
            throw new Error(
                "Authenticated requests can only be sent once a user has logged in"
            );
        }
    }
}
