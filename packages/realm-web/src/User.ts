import type { App } from "./App";

interface UserParameters {
    app: App<any>;
    id: string;
    accessToken: string;
    refreshToken: string;
    controllerReady?: (controller: UserController) => void;
}

export enum UserState {
    Active = "active",
    LoggedOut = "logged-out",
    Removed = "removed"
}

// tslint:disable:completed-docs

export interface UserController {
    setAccessToken(token: string): void;
    setState(state: UserState): void;
    setProfile(profile: Realm.UserProfile): void;
    forgetTokens(): void;
}

export interface UserControlHandle {
    user: User;
    controller: UserController;
}

// tslint:enable:completed-docs

/**
 * User being logged into an app
 */
export class User implements Realm.User {
    /**
     * The app that this user is associated with.
     */
    public readonly app: App<any>;
    /**
     * The list of identities associated with this user.
     * // TODO: Implement and test this ...
     */
    public readonly identities: Realm.UserIdentity[] = [];

    /**
     * Create a user, returning both the user and a controller enabling updates to the users internal state.
     * @param parameters The parameters passed to the constructor.
     */
    public static create(parameters: UserParameters): UserControlHandle {
        const { controllerReady, ...otherParameters } = parameters;
        let controller: UserController | undefined;
        const user = new User({
            ...otherParameters,
            controllerReady: c => {
                if (controllerReady) {
                    controllerReady(c);
                }
                controller = c;
            },
        });
        if (controller) {
            return { user, controller };
        } else {
            throw new Error("Expected controllerReady to be called synchronously")
        }
    }

    private _id: string;
    private _accessToken: string | null;
    private _refreshToken: string | null;
    private _profile: Realm.UserProfile | undefined;
    private _state: Realm.UserState;

    public constructor({ app, id, accessToken, refreshToken, controllerReady }: UserParameters) {
        this.app = app;
        this._id = id;
        this._accessToken = accessToken;
        this._refreshToken = refreshToken;
        this._state = UserState.Active;

        // Create and expose the controller to the creator
        if (controllerReady) {
            controllerReady({
                setAccessToken: token => this._accessToken = token,
                setProfile: profile => this._profile = profile,
                setState: state => this._state = state,
                forgetTokens: () => {
                    this._accessToken = null;
                    this._refreshToken = null;
                },
            });
        }
    }

    /**
     * The id of the user in the MongoDB Realm database.
     */
    get id() {
        return this._id;
    }

    /**
     * The access token used to authenticate the user towards MongoDB Realm.
     */
    get accessToken() {
        return this._accessToken;
    }

    /**
     * The refresh token used to issue new access tokens.
     */
    get refreshToken() {
        return this._refreshToken;
    }

    /**
     * The state of the user is one of:
     * - "active" The user is logged in and ready.
     * - "logged-out" The user was logged in, but is no longer logged in.
     * - "removed" The user was logged in, but removed entirely from the app again.
     */
    get state(): Realm.UserState {
        return this._state;
    }

    /**
     * Detailed information about the user.
     */
    get profile(): Realm.UserProfile {
        if (this._profile) {
            return this._profile;
        } else {
            throw new Error("A profile was never fetched for this user");
        }
    }
}
