import { MochaRemoteClient } from "mocha-remote-client";

const mochaClient = new MochaRemoteClient({
    whenInstrumented: () => {
        require("./constructor");
        require("./credentials");
    }
});
