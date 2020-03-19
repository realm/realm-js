import { MochaRemoteClient } from "mocha-remote-client";

const mochaClient = new MochaRemoteClient({
    whenInstrumented: () => {
        require("./app.test");
        require("./credentials.test");
        require("./functions.test");
    }
});
