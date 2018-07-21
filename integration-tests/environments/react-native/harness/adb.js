const cp = require("child_process");

function getAdbPath() {
    return process.env.ANDROID_HOME
        ? process.env.ANDROID_HOME + "/platform-tools/adb"
        : "adb";
}

module.exports = {
    reverseServerPort: (port) => {
        const adbPath = getAdbPath();
        const adbArgs = ["reverse", `tcp:${port}`, `tcp:${port}`];
        console.log(`Running ${adbPath} ${adbArgs.join(" ")}`);
        cp.execFileSync(adbPath, adbArgs, {
            stdio: ["inherit", "inherit", "inherit"],
        });
    },
};
