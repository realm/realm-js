import { stringify } from "flatted/esm";

export class WebSocketReporter {
    static create(ws) {
        const instance = new WebSocketReporter(ws);
        return instance.reporter;
    }

    constructor(ws) {
        this.ws = ws;
    }

    reporter = (runner) => {
        /*
         * Register all relevant event listeners
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
        const eventNames = [
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
        // Loop the names and add listeners for all of them
        for (const eventName of eventNames) {
            runner.on(eventName, this.send.bind(this, eventName));
        }
    }

    send(type, ...args) {
        if (this.ws.readyState === WebSocket.OPEN) {
            // Stringify using flatted to avoid issues with circular references
            args = args.map(arg => {
                // Stringifing an Error doesn't extract the message or stacktrace
                // @see https://stackoverflow.com/a/18391400/503899
                if (arg instanceof Error) {
                    const result = {};
                    Object.getOwnPropertyNames(arg).forEach(key => {
                        result[key] = arg[key];
                    });
                    return result;
                } else {
                    return arg;
                }
            });
            // Serialize the arguments
            const data = stringify({ type, args });
            // Send the message
            this.ws.send(data);
        }
    }
}
