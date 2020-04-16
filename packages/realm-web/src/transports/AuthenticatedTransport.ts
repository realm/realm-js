import { Transport, Request } from "./Transport";
import { PrefixedTransport } from "./PrefixedTransport";

/**
 * Used to control which user is currently active - this would most likely be the {App} instance.
 */
interface UserContext {
    /**
     * The currently active user
     */
    currentUser: Realm.User | null;
}

/**
 * Fetches resources as a particular user.
 */
export class AuthenticatedTransport implements Transport {
    /**
     * An object controlling which user is currently active.
     */
    private readonly userContext: UserContext;

    /**
     * Underlying transport.
     */
    private readonly transport: Transport;

    /**
     * Constructs a transport that injects authorization headers to requests.
     *
     * @param userContext The context controlling what user is authenticated.
     * @param transport The underlying transport.
     */
    public constructor(userContext: UserContext, transport: Transport) {
        this.userContext = userContext;
        this.transport = transport;
    }

    /** @inheritdoc */
    public fetch<RequestBody extends any, ResponseBody extends any>(
        request: Request<RequestBody>,
        user: Realm.User | null = this.userContext.currentUser,
    ): Promise<ResponseBody> {
        return this.transport.fetch({
            ...request,
            headers: {
                ...this.buildAuthorizationHeader(user),
                ...request.headers,
            },
        });
    }

    /** @inheritdoc */
    public prefix(pathPrefix: string): Transport {
        return new PrefixedTransport(this, pathPrefix);
    }

    /**
     * Generate an object with an authorization header to issue requests as a specific user.
     *
     * @param user An optional user to generate the header for
     * @returns An object containing with the users access token as authorization header or undefined if no user is given.
     */
    private buildAuthorizationHeader(user: Realm.User | null) {
        if (user) {
            // TODO: Ensure the access token is valid
            return {
                Authorization: `Bearer ${user.accessToken}`,
            };
        }
    }
}
