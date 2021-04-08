////////////////////////////////////////////////////////////////////////////
//
// Copyright 2019 Realm Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
////////////////////////////////////////////////////////////////////////////

/**
 * Extended from Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow
 */

import { Client } from "mocha-remote-client";
import React, { Component } from "react";
import {
    Button,
    Platform,
    StyleSheet,
    Text,
    View,
    NativeModules,
} from "react-native";
import { Circle } from "react-native-progress";

// NativeModules.DevSettings.setIsDebuggingRemotely(false);

const mode =
    typeof DedicatedWorkerGlobalScope === "undefined"
        ? "native"
        : "chrome-debugging";

export class App extends Component {
    state = { status: "disconnected" };

    componentDidMount() {
        this.prepareTests();
    }

    componentWillUnmount() {
        if (this.client) {
            console.log("Disconnecting from the mocha-remote server");
            this.client.disconnect();
        }
    }

    render() {
        const { totalTests, currentTestIndex, status } = this.state;
        const progress = totalTests > 0 ? currentTestIndex / totalTests : 0;
        return (
            <View style={styles.container}>
                <Text style={styles.mode}>{this.modeMessage}</Text>
                <Text style={styles.status}>{this.statusMessage}</Text>
                <Circle
                    showsText
                    size={100}
                    indeterminate={status !== "running" && status !== "ended"}
                    progress={progress}
                    animated={status !== "ended"}
                    disabled={status === "ended"}
                    color={this.statusColor}
                    textColor={this.statusColor}
                />
                <Text style={styles.details}>{this.statusDetails}</Text>
                <Button
                    title="Run tests natively"
                    disabled={status === "running"}
                    onPress={this.handleRerunNative}
                />
                <Button
                    title="Run tests in Chrome debugging mode"
                    disabled={status === "running"}
                    onPress={this.handleRerunChromeDebugging}
                />
                <Button
                    title="Abort running the tests"
                    disabled={status !== "running"}
                    onPress={this.handleAbort}
                />
            </View>
        );
    }

    handleRerunNative = () => {
        if (mode === "native") {
            NativeModules.DevSettings.reload();
        } else {
            NativeModules.DevSettings.setIsDebuggingRemotely(false);
        }
    };

    handleRerunChromeDebugging = () => {
        if (mode === "chrome-debugging") {
            NativeModules.DevSettings.reload();
        } else {
            NativeModules.DevSettings.setIsDebuggingRemotely(true);
        }
    };

    handleAbort = () => {
        if (this.runner) {
            this.runner.abort();
        }
    };

    get statusMessage() {
        if (this.state.status === "disconnected") {
            return "Disconnected from mocha-remote-server";
        } else if (this.state.status === "waiting") {
            return "Waiting for server to start tests";
        } else if (this.state.status === "running") {
            return "Running the tests";
        } else if (this.state.status === "ended") {
            return "The tests ended";
        } else {
            return null;
        }
    }

    get statusDetails() {
        const {
            status,
            currentTest,
            currentTestIndex,
            failures,
            reason,
        } = this.state;
        if (status === "running") {
            return currentTest;
        } else if (typeof reason === "string") {
            return reason;
        } else if (typeof failures === "number") {
            return `Ran ${currentTestIndex + 1} tests (${failures} failures)`;
        } else {
            return null;
        }
    }

    get modeMessage() {
        if (mode === "native") {
            return "Running natively on device";
        } else if (mode === "chrome-debugging") {
            return "Running in Chrome debugging mode";
        } else {
            return "Unknown mode";
        }
    }

    get statusColor() {
        const { status, failures } = this.state;
        if (status === "ended") {
            return failures > 0 ? "red" : "green";
        } else {
            return undefined;
        }
    }

    prepareTests() {
        this.client = new Client({
            id: Platform.OS,
            tests(context) {
                // Setting the title of the root suite
                global.title = `React-Native on ${Platform.OS} (${mode})`;
                // Provide the globals for the tests
                const Realm = require("realm");
                // When running on device the native module sets the `Realm` global
                if (typeof global.Realm !== "object") {
                    // This happens when the app is running in chome debugging mode
                    global.Realm = Realm;
                }
                global.fs = require("react-native-fs");
                global.path = require("path-browserify");
                global.environment = {
                    reactNative: Platform.OS,
                    android: Platform.OS === "android",
                    ios: Platform.OS === "ios",
                    chromeDebugging: mode === "chrome-debugging",
                };
                // Make all test related modules reinitialize
                const modules = require.getModules();
                for (const [_id, m] of Object.entries(modules)) {
                    if (m.verboseName.startsWith("../../tests/")) {
                        m.isInitialized = false;
                    }
                }
                // Require in the integration tests
                require("realm-integration-tests");
                /* global beforeEach */
                beforeEach(() => {
                    // Adding an async task before each, allowing the UI to update
                    return new Promise(resolve => setTimeout(resolve, 0));
                });
            },
        });

        this.client
            .on("connected", () => {
                console.log("Connected to mocha-remote-server");
                this.setState({ status: "waiting" });
            })
            .on("disconnected", ({ reason = "No reason" }) => {
                console.error(`Disconnected: ${reason}`);
                this.setState({ status: "disconnected", reason });
            })
            .on("running", runner => {
                // Store the active runner on the App
                this.runner = runner;
                // Check if the tests were loaded correctly
                if (runner.total > 0) {
                    this.setState({
                        status: "running",
                        failures: 0,
                        currentTestIndex: 0,
                        totalTests: runner.total,
                    });
                } else {
                    this.setState({
                        status: "ended",
                        reason: "No tests were loaded",
                    });
                }

                runner.on("test", test => {
                    // Compute the current test index - incrementing it if we're running
                    // Set the state to update the UI
                    this.setState({
                        status: "running",
                        currentTest: test.fullTitle(),
                        currentTestIndex: this.state.currentTestIndex + 1,
                        totalTests: runner.total,
                    });
                });

                runner.on("end", () => {
                    this.setState({
                        status: "ended",
                        failures: runner.failures,
                    });
                    // Stop trying to connect to the remote server
                    this.client.disconnect();
                    delete this.client;
                    delete this.runner;
                });
            });
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F5FCFF",
    },
    mode: {
        fontSize: 14,
        margin: 10,
        color: "dimgray",
    },
    status: {
        fontSize: 20,
        margin: 10,
    },
    details: {
        fontSize: 14,
        padding: 10,
        width: "100%",
        textAlign: "center",
        height: 100,
    },
});
