import { create as createFunctionsFactory } from "./FunctionsFactory";
import { User, UserState, UserControlHandle } from "./User";
import { NetworkTransport } from "realm-network-transport";
import { AuthenticatedTransport, Transport, BaseTransport } from "./transports";

/**
 * Configuration to pass as an argument when constructing an app.
 */
export interface AppConfiguration extends Realm.AppConfiguration {
    /** Transport to use when fetching resources */
    transport?: NetworkTransport;
}

/**
 * MongoDB Realm App
 */
export class App<
    FunctionsFactoryType extends Realm.BaseFunctionsFactory = Realm.DefaultFunctionsFactory
> implements Realm.App<FunctionsFactoryType> {
    /** @inheritdoc */
    public readonly functions: FunctionsFactoryType;

    /** @inheritdoc */
    public readonly id: string;

    /**
     * Default base url to prefix all requests if no baseUrl is specified in the configuration.
     */
    public static readonly DEFAULT_BASE_URL = "https://stitch.mongodb.com";

    /**
     * This base route will be prefixed requests issued through by the base transport
     */
    private static readonly BASE_ROUTE = "/api/client/v2.0";

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
     * Construct a Realm App, either from the Realm App id visible from the MongoDB Realm UI or a configuration.
     *
     * @param idOrConfiguration The Realm App id or a configuration to use for this app.
     */
    constructor(idOrConfiguration: string | AppConfiguration) {
        // If the argument is a string, convert it to a simple configuration object.
        const configuration =
            typeof idOrConfiguration === "string"
                ? { id: idOrConfiguration }
                : idOrConfiguration;
        // Initialize properties from the configuration
        if (
            typeof configuration === "object" &&
            typeof configuration.id === "string"
        ) {
            this.id = configuration.id;
        } else {
            throw new Error("Missing a MongoDB Realm app-id");
        }
        const baseUrl = configuration.baseUrl || App.DEFAULT_BASE_URL;
        // Get or construct the network transport
        const baseUrlTransport = new BaseTransport(
            configuration.transport,
            baseUrl,
        );
        // Construct an object, wrapping the network transport, enabling authenticated requests
        const authTransport = new AuthenticatedTransport(
            baseUrlTransport,
            this,
        );
        this.baseTransport = authTransport.prefix(App.BASE_ROUTE);
        this.appTransport = this.baseTransport.prefix(`/app/${this.id}`);
        // Construct the functions factory
        this.functions = createFunctionsFactory<FunctionsFactoryType>(
            this.appTransport,
        );
    }

    /**
     * Switch user
     *
     * @param nextUser The user or id of the user to switch to
     */
    public switchUser(nextUser: User | string) {
        if (typeof nextUser === "string") {
            const handle = this.users.find(({ user: u }) => u.id === nextUser);
            if (handle) {
                this.switchUser(handle.user);
            } else {
                throw new Error(
                    `Failed to switch user (id = ${nextUser}) - did you log in?`,
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
                throw new Error("The user was not logged into this app");
            }
        } else {
            throw new Error("Expected a user id or a User instance");
        }
    }

    /**
     * Log in a user
     *
     * @param credentials Credentials to use when logging in
     * @param fetchProfile Should the users profile be fetched? (default: true)
     */
    public async logIn(credentials: Realm.Credentials, fetchProfile = true) {
        // See https://github.com/mongodb/stitch-js-sdk/blob/310f0bd5af80f818cdfbc3caf1ae29ffa8e9c7cf/packages/core/sdk/src/auth/internal/CoreStitchAuth.ts#L746-L780
        const response = await this.appTransport.fetch(
            {
                method: "POST",
                path: `/auth/providers/${credentials.providerName}/login`,
                body: credentials.toJSON(),
            },
            null,
        );
        // Spread out values from the response and ensure they're valid
        const {
            user_id: userId,
            access_token: accessToken,
            refresh_token: refreshToken,
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
            refreshToken,
        });
        // If neeeded, fetch and set the profile on the user
        if (fetchProfile) {
            const profile = await this.baseTransport.fetch(
                { method: "GET", path: "/auth/profile" },
                handle.user,
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
     *
     * @param userOrId The user or id of the user to log out (default: currentUser)
     */
    public async logOut(
        userOrId: Realm.User | string | null = this.currentUser,
    ) {
        const { user, controller } = this.getUserHandle(userOrId);
        // Invalidate the refresh token
        await this.baseTransport.fetch({
            method: "DELETE",
            path: "/auth/session",
            headers: {
                Authorization: `Bearer ${user.refreshToken}`,
            },
        });
        // Make the user forget its tokens
        controller.forgetTokens();
        // Set the state of the user
        controller.setState(UserState.LoggedOut);
    }

    /**
     * Remove a user entirely from the app (logs out the user if they're not already logged out)
     *
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
     *
     * @returns the currently active user or null.
     */
    public get currentUser(): Realm.User | null {
        const activeUserHandles = this.users.filter(
            ({ user }) => user.state === UserState.Active,
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
     *
     * @returns An array of users active or loggedout users (current user being the first).
     */
    public get allUsers(): Readonly<Realm.User[]> {
        const allUsers = this.users.map(({ user }) => user);
        const activeUsers = allUsers.filter(
            user => user.state === UserState.Active,
        );
        const loggedOutUsers = allUsers.filter(
            user => user.state === UserState.LoggedOut,
        );
        // Returning a freezed copy of the list of users to prevent outside changes
        return Object.freeze([...activeUsers, ...loggedOutUsers]);
    }

    /**
     * Get the (user and it's controller) handle of a user
     *
     * @param userOrId A user object or user id
     * @returns A handle containing the user and it's controller.
     */
    private getUserHandle(userOrId: Realm.User | string | null) {
        const handle = this.users.find(({ user }) =>
            typeof userOrId === "string"
                ? user.id === userOrId
                : user === userOrId,
        );
        if (handle) {
            return handle;
        } else {
            throw new Error("Invalid user or user id");
        }
    }
}
