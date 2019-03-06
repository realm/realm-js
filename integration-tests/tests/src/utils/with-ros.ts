import { ITestCallbackContext } from "mocha";
import * as Realm from "realm";
import * as uuid from "uuid";

// TODO: Adapt this to the environment passed as a global instead of reading it from the process global, which will not
// be available from React Native.

const { REALM_OBJECT_SERVER_URL } = process.env;

if (typeof REALM_OBJECT_SERVER_URL === "string") {
    // tslint:disable-next-line:no-console
    console.log(
        `Running tests requiring ROS against ${REALM_OBJECT_SERVER_URL}`
    );
} else {
    // tslint:disable-next-line:no-console
    console.log(
        'Define "REALM_OBJECT_SERVER_URL" environment variable to run tests that require ROS'
    );
}

interface IRealmObjectServer {
    url: string;
    createTestUser: () => Promise<Realm.Sync.User>;
}

interface ITestCallbackContextWithROS extends ITestCallbackContext {
    ros: IRealmObjectServer;
}

const ros: IRealmObjectServer = {
    createTestUser: () => {
        return Realm.Sync.User.login(
            REALM_OBJECT_SERVER_URL,
            Realm.Sync.Credentials.nickname(`realm-js-tests-${uuid()}`)
        );
    },
    url: REALM_OBJECT_SERVER_URL
};

/**
 * Runs tests only if a Realm Object Server was started by the environment running the tests.
 */
export const withROS = {
    it: (
        expectation: string,
        callback?: (
            this: ITestCallbackContextWithROS,
            done: MochaDone
        ) => PromiseLike<any> | void
    ) => {
        if (typeof REALM_OBJECT_SERVER_URL === "string") {
            it(expectation, function (...args) {
                // Communicating with ROS takes longer than other tests
                this.timeout(5000);
                return callback.call({ ...this, ros }, ...args);
            });
        } else {
            it.skip(expectation);
        }
    }
};
