/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow
 */

import React, { Component } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { Mocha } from "mocha";
import * as util from "util";
import { stringify } from "flatted/esm";

import { WebSocketReporter } from "./websocket-reporter";

const HARNESS_PORT = 8090;

const instructions = Platform.select({
    ios: "Press Cmd+R to reload,\n" + "Cmd+D or shake for dev menu",
    android:
      "Double tap R on your keyboard to reload,\n" +
      "Shake or press menu button for dev menu",
});

type Props = {};
export class App extends Component<Props> {
    componentDidMount() {
        this.ws = new WebSocket(`http://localhost:${HARNESS_PORT}`);
        this.ws.addEventListener("open", () => {
            // Instrument the app to console log into the test harness server
            const oldConsoleLog = global.console.log;
            global.console.log = (...args) => {
                oldConsoleLog(...args);
                // Converting objects to strings using the util.inspect to prevent circularity
                const safeArgs = args.map(arg => {
                    if (typeof(arg) === "object") {
                        return util.inspect(arg);
                    } else {
                        return arg;
                    }
                });
                this.send("log", ...safeArgs);
            };
            // Log a message to let the server know we're connected
            console.log("This message was logged in the app");
            // Start running the tests
            this.startTests();
        });
    }

    componentWillUnmount() {
        if (this.ws) {
            this.ws.close();
            delete this.ws;
        }
    }

    render() {
        return (
            <View style={styles.container}>
                <Text style={styles.welcome}>Welcome to React Native!</Text>
                <Text style={styles.instructions}>To get started, edit App.js</Text>
                <Text style={styles.instructions}>{instructions}</Text>
            </View>
        );
    }

    send(type, ...args) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const data = stringify({ type, args });
            this.ws.send(data);
        } else {
            throw new Error("Can only send to an open WebSocket");
        }
    }

    startTests() {
        // Create a reporter that sends all Mocha events to the runners server
        const reporter = WebSocketReporter.create(this.ws);
        // Create the mocha instance
        const mocha = new Mocha({ reporter });

        // Setting the title of the root suite
        mocha.suite.title = `React-Native on ${Platform.OS}`;
        // This will setup the mocha globals (describe, it, etc.)
        // @see https://github.com/mochajs/mocha/blob/v5.2.0/browser-entry.js#L119
        mocha.suite.emit("pre-require", global, null, mocha);
        // Provide the global Realm constructor to the tests
        global.Realm = require("realm");
        // Require in the tests
        require("@realm-tests/tests");

        // Run the tests
        mocha.run();
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F5FCFF",
    },
    welcome: {
        fontSize: 20,
        textAlign: "center",
        margin: 10,
    },
    instructions: {
        textAlign: "center",
        color: "#333333",
        marginBottom: 5,
    },
});
