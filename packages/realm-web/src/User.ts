import type { App } from "./App";

// Disabling requiring JSDoc for now - as the User class is exported as the Realm.User interface, which is already documented.
/* eslint-disable jsdoc/require-jsdoc */

interface UserParameters {
    app: App<any>;
    id: string;
    accessToken: string;
    refreshToken: string;
    onController?: (controller: UserController) => void;
}

export enum UserState {
    Active = "active",
    LoggedOut = "logged-out",
    Removed = "removed",
}

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

/**
 * Representation of an authenticated user of an app.
 */
export class User implements Realm.User {
    /**
     * The app that this user is associated with.
     */
    public readonly app: App<any>;

    /*
     * The list of identities associated with this user.
     * // TODO: Implement and test this ...
     */
    // public readonly identities: Realm.UserIdentity[] = [];

    /**
     * Create a user, returning both the user and a controller enabling updates to the user's internal state.
     *
     * @param parameters The parameters passed to the constructor.
     * @returns an object containing the new user and its controller.
     */
    public static create(parameters: UserParameters): UserControlHandle {
        const { onController, ...otherParameters } = parameters;
        let controller: UserController | undefined;
        const user = new User({
            ...otherParameters,
            onController: c => {
                if (onController) {
                    onController(c);
                }
                controller = c;
            },
        });
        if (controller) {
            return { user, controller };
        } else {
            throw new Error(
                "Expected controllerReady to be called synchronously",
            );
        }
    }

    private _id: string;
    private _accessToken: string | null;
    private _refreshToken: string | null;
    private _profile: Realm.UserProfile | undefined;
    private _state: Realm.UserState;

    public constructor({
        app,
        id,
        accessToken,
        refreshToken,
        onController,
    }: UserParameters) {
        this.app = app;
        this._id = id;
        this._accessToken = accessToken;
        this._refreshToken = refreshToken;
        this._state = UserState.Active;

        // Create and expose the controller to the creator
        if (onController) {
            const controller: UserController = {
                setAccessToken: token => {
                    this._accessToken = token;
                },
                setProfile: profile => {
                    this._profile = profile;
                },
                setState: state => {
                    this._state = state;
                },
                forgetTokens: () => {
                    this._accessToken = null;
                    this._refreshToken = null;
                },
            };
            onController(controller);
        }
    }

    /**
     * The automatically-generated internal ID of the user.
     *
     * @returns The id of the user in the MongoDB Realm database.
     */
    get id() {
        return this._id;
    }

    /**
     * @returns The access token used to authenticate the user towards MongoDB Realm.
     */
    get accessToken() {
        return this._accessToken;
    }

    /**
     * @returns The refresh token used to issue new access tokens.
     */
    get refreshToken() {
        return this._refreshToken;
    }

    /**
     * The state of the user is one of:
     * - "active" The user is logged in and ready.
     * - "logged-out" The user was logged in, but is no longer logged in.
     * - "removed" The user was logged in, but removed entirely from the app again.
     *
     * @returns The current state of the user.
     */
    get state(): Realm.UserState {
        return this._state;
    }

    /**
     * @returns Profile containing detailed information about the user.
     */
    get profile(): Realm.UserProfile {
        if (this._profile) {
            return this._profile;
        } else {
            throw new Error("A profile was never fetched for this user");
        }
    }
}
