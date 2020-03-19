import { Transport, Request } from "./Transport";
import { PrefixedTransport } from "./PrefixedTransport";

interface UserContext {
    /** The currently active user */
    currentUser: Realm.User | null;
}

/**
 * Fetches resources as a particular user.
 */
export class AuthenticatedTransport implements Transport {
    private readonly userContext: UserContext;
    private readonly transport: Transport;

    public constructor(userContext: UserContext, transport: Transport) {
        this.userContext = userContext;
        this.transport = transport;
    }

    /** @inheritdoc */
    public fetch<RequestBody extends any, ResponseBody extends any>(
        request: Request<RequestBody>,
        user: Realm.User | null = this.userContext.currentUser
    ): Promise<ResponseBody> {
        return this.transport.fetch({
            ...request,
            headers: {
                ...this.buildAuthorizationHeader(user),
                ...request.headers
            }
        });
    }

    /** @inheritdoc */
    public prefix(pathPrefix: string): Transport {
        return new PrefixedTransport(this, pathPrefix);
    }

    private buildAuthorizationHeader(user: Realm.User | null) {
        if (user) {
            // TODO: Ensure the access token is valid
            return {
                Authorization: `Bearer ${user.accessToken}`
            };
        }
    }
}
