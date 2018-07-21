const cp = require("child_process");

function async(...args) {
    return cp.spawn(
        "node",
        [ require.resolve("react-native/local-cli/cli.js"), ...args ],
        { stdio: ["inherit", "inherit", "inherit"] }
    );
}

function sync(...args) {
    return cp.spawnSync(
        "node",
        [ require.resolve("react-native/local-cli/cli.js"), ...args ],
        { stdio: ["inherit", "inherit", "inherit"] }
    );
}

module.exports = { async, sync };
