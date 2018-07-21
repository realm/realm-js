const { parse } = require("flatted/cjs");
const WebSocket = require("ws");
const EventEmitter = require("events");
const { Test, Suite } = require("mocha");

function inflateRunnable(data) {
    // Create an actual test object to allow calls to methods
    const runnable = data.type === "test" ? new Test(data.title) : new Suite(data.title);
    // Patch the data onto the test
    Object.assign(runnable, data);
    // If it has a parent - inflate that too
    if (runnable.parent) {
        runnable.parent = inflateRunnable(runnable.parent);
    }
    return runnable;
}

/*
 * Mocha events
 *   - `start`  execution started
 *   - `end`  execution complete
 *   - `suite`  (suite) test suite execution started
 *   - `suite end`  (suite) all tests (and sub-suites) have finished
 *   - `test`  (test) test execution started
 *   - `test end`  (test) test completed
 *   - `hook`  (hook) hook execution started
 *   - `hook end`  (hook) hook complete
 *   - `pass`  (test) test passed
 *   - `fail`  (test, err) test failed
 *   - `pending`  (test) test pending
 */
const mochaEventNames = [
    "start",
    "end",
    "suite",
    "suite end",
    "test",
    "test end",
    "hook",
    "hook end",
    "pass",
    "fail",
    "pending"
];

class Server extends EventEmitter {

    start(port) {
        return new Promise((resolve, reject) => {
            this.wss = new WebSocket.Server({ port });
            this.wss.on("listening", () => {
                resolve(this.wss);
            });
            this.wss.on("error", (err) => {
                reject(err);
            });
            this.wss.on("connection", (ws) => {
                console.log("Test harness client connected");
                ws.on("message", (message) => {
                    this.onMessage(ws, message);
                });
            });
        });
    }

    onMessage(ws, message) {
        const { type, args } = parse(message);
        if (type === "log") {
            // Prepend an emoji for every line
            const message = new String(args.join(" "));
            // Split on newlines, prepend an emoji and join again
            const prependedMessage = message.split("\n").map(line => {
                return `📱 ${line}`;
            }).join("\n");
            // Print the message prepended with emojis
            console.log(prependedMessage);
        } else if (mochaEventNames.indexOf(type) !== -1) {
            // Monkey patch the test object when it passes
            if (["test", "test end", "pass", "fail", "pending"].indexOf(type) >= 0) {
                // Create an actual test object to allow calls to methods
                args[0] = inflateRunnable(args[0]);
            }
            this.emit(type, ...args);
        } else {
            throw new Error(`Unexpected message typed ${type}`);
        }
    }
}

module.exports = { Server };
