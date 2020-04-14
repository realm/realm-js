import { create as createFunctionsFactory } from "./FunctionsFactory";
import { User, UserState, UserControlHandle } from "./User";
import { NetworkTransport } from "realm-network-transport";
import { AuthenticatedTransport, Transport, BaseTransport } from "./transports";

export interface AppConfiguration extends Realm.AppConfiguration {
    /** Transport to use when fetching resources */
    transport: NetworkTransport;
}

/**
 * MongoDB Realm App
 */
export class App<FunctionsFactoryType extends Realm.FunctionsFactory>
    implements Realm.App {
    public readonly functions: FunctionsFactoryType;
    public readonly id: string;
    public readonly baseRoute = "/api/client/v2.0";

    /**
     * Default base url to prefix all requests if no baseUrl is specified in the configuration.
     */
    public static DEFAULT_BASE_URL = "https://stitch.mongodb.com";

    /**
     * A transport adding the base route prefix to all requests
     */
    private readonly baseTransport: Transport;

    /**
     * A transport adding the base and app route prefix to all requests
     */
    private readonly appTransport: Transport;

    /**
     * A (reversed) stack of active and logged-out users.
     * Elements in the beginning of the array is considered more recent than the later elements.
     */
    private readonly users: UserControlHandle[] = [];

    /**
     * Construct a Realm App.
     * @param id The Realm App id visible from the MongoDB Realm UI
     * @param configuration A configuration to use for this app.
     */
    constructor(id: string, configuration: Partial<AppConfiguration> = {}) {
        if (typeof id !== "string") {
            throw new Error("Missing a MongoDB Realm app-id");
        }
        this.id = id;
        const baseUrl = configuration.baseUrl || App.DEFAULT_BASE_URL;
        // Get or construct the network transport
        const baseUrlTransport = new BaseTransport(
            baseUrl,
            configuration.transport
        );
        // Construct an object, wrapping the network transport, enabling authenticated requests
        const authTransport = new AuthenticatedTransport(
            this,
            baseUrlTransport
        );
        this.baseTransport = authTransport.prefix(this.baseRoute);
        this.appTransport = this.baseTransport.prefix(`/app/${this.id}`);
        // Construct the functions factory
        this.functions = createFunctionsFactory<FunctionsFactoryType>({
            transport: this.appTransport
        });
    }

    /**
     * Switch user
     * @param nextUser The user or id of the user to switch to
     */
    public switchUser(nextUser: User | string) {
        if (typeof nextUser === "string") {
            const handle = this.users.find(({ user: u }) => u.id === nextUser);
            if (handle) {
                this.switchUser(handle.user);
            } else {
                throw new Error(
                    `Failed to switch user (id = ${nextUser}) - did you log in?`
                );
            }
        } else if (nextUser instanceof User) {
            const index = this.users.findIndex(({ user }) => user === nextUser);
            if (index >= 0) {
                // Remove the user from the stack
                const [handle] = this.users.splice(index, 1);
                // Insert the user in the beginning of the stack
                this.users.splice(0, 0, handle);
            } else {
                throw new Error(
                    "Cannot switch to a user that was never logged in"
                );
            }
        } else {
            throw new Error("Expected a user id or a User instance");
        }
    }

    /**
     * Log in a user
     * @param credentials Credentials to use when logging in
     * @param fetchProfile Should the users profile be fetched? (default: true)
     */
    public async logIn(credentials: Realm.Credentials, fetchProfile = true) {
        // See https://github.com/mongodb/stitch-js-sdk/blob/310f0bd5af80f818cdfbc3caf1ae29ffa8e9c7cf/packages/core/sdk/src/auth/internal/CoreStitchAuth.ts#L746-L780
        const response = await this.appTransport.fetch(
            {
                method: "POST",
                path: `/auth/providers/${credentials.providerName}/login`,
                body: credentials.material
            },
            null
        );
        // Spread out values from the response and ensure they're valid
        const {
            user_id: userId,
            access_token: accessToken,
            refresh_token: refreshToken
        } = response;
        if (typeof userId !== "string") {
            throw new Error("Expected a user id in the response");
        }
        if (typeof accessToken !== "string") {
            throw new Error("Expected an access token in the response");
        }
        if (typeof refreshToken !== "string") {
            throw new Error("Expected an refresh token in the response");
        }
        // Create the user
        const handle = User.create({
            app: this,
            id: userId,
            accessToken,
            refreshToken
        });
        // If neeeded, fetch and set the profile on the user
        if (fetchProfile) {
            const profile = await this.baseTransport.fetch(
                { method: "GET", path: "/auth/profile" },
                handle.user
            );
            handle.controller.setProfile(profile);
        }
        // Add the user at the top of the stack
        this.users.splice(0, 0, handle);
        // Return the user
        return handle.user;
    }

    /**
     * Log out a user
     * @param userOrId The user or id of the user to log out (default: currentUser)
     */
    public async logOut(
        userOrId: Realm.User | string | null = this.currentUser
    ) {
        const { user, controller } = this.getUserHandle(userOrId);
        // Invalidate the refresh token
        await this.baseTransport.fetch({
            method: "DELETE",
            path: "/auth/session",
            headers: {
                Authorization: `Bearer ${user.refreshToken}`
            }
        });
        // Make the user forget its tokens
        controller.forgetTokens();
        // Set the state of the user
        controller.setState(UserState.LoggedOut);
    }

    /**
     * Remove a user entirely from the app (logs out the user if they're not already logged out)
     * @param userOrId The user or id of the user to remove.
     */
    public async removeUser(userOrId: Realm.User | string) {
        const { user, controller } = this.getUserHandle(userOrId);
        // If active - log out the user
        if (user.state === UserState.Active) {
            await this.logOut(user);
        }
        // Set the state of the user
        controller.setState(UserState.Removed);
        // Remove the user from the list of users
        const index = this.users.findIndex(({ user: u }) => u === user);
        this.users.splice(index, 1);
        // TODO: Delete any data / tokens which were persisted
    }

    /**
     * The currently active user (or null if no active users exists)
     */
    public get currentUser(): Realm.User | null {
        const activeUserHandles = this.users.filter(
            ({ user }) => user.state === UserState.Active
        );
        if (activeUserHandles.length === 0) {
            return null;
        } else {
            // Current user is the top of the stack
            return activeUserHandles[0].user;
        }
    }

    /**
     * All active and logged-out users:
     *  - First in the list are active users (ordered by most recent call to switchUser or login)
     *  - Followed by logged out users (also ordered by most recent call to switchUser or login).
     */
    public get allUsers(): Readonly<Realm.User[]> {
        const allUsers = this.users.map(({ user }) => user);
        const activeUsers = allUsers.filter(
            user => user.state === UserState.Active
        );
        const loggedOutUsers = allUsers.filter(
            user => user.state === UserState.LoggedOut
        );
        // Returning a freezed copy of the list of users to prevent outside changes
        return Object.freeze([...activeUsers, ...loggedOutUsers]);
    }

    /**
     * Get the (user and it's controller) handle of a user
     * @param userOrId A user object or user id
     */
    private getUserHandle(userOrId: Realm.User | string | null) {
        const handle = this.users.find(({ user }) =>
            typeof userOrId === "string"
                ? user.id === userOrId
                : user === userOrId
        );
        if (handle) {
            return handle;
        } else {
            throw new Error("Unexpected user or user id - did you log in?");
        }
    }
}
