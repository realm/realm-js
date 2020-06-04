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

import React, { Component } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { MochaRemoteClient } from "mocha-remote-client";

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
        return (
            <View style={styles.container}>
                <Text style={styles.status}>{this.getStatusMessage()}</Text>
                <Text style={styles.details}>{this.getStatusDetails()}</Text>
            </View>
        );
    }

    getStatusMessage() {
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

    getStatusDetails() {
        const {
            status,
            totalTests,
            currentTestIndex,
            currentTest,
            failures,
            reason,
        } = this.state;
        if (status === "running") {
            const progress = `${currentTestIndex + 1}/${totalTests}`;
            return `${progress}: ${currentTest}`;
        } else if (typeof reason === "string") {
            return reason;
        } else if (typeof failures === "number") {
            return `Ran ${totalTests} tests, with ${failures} failures`;
        } else {
            return null;
        }
    }

    prepareTests() {
        this.client = new MochaRemoteClient({
            id: Platform.OS,
            onConnected: () => {
                console.log("Connected to mocha-remote-server");
                this.setState({ status: "waiting" });
            },
            onDisconnected: ({ reason }) => {
                console.error(`Disconnected: ${reason}`);
                this.setState({ status: "disconnected", reason });
            },
            onInstrumented: mocha => {
                // Setting the title of the root suite
                global.title = `React-Native on ${Platform.OS}`;
                // Provide the global Realm constructor to the tests
                // Simply requiring Realm will set the global for us ...
                // global.Realm = require('realm');
                require("realm");
                global.fs = require("react-native-fs");
                global.path = require("path-browserify");
                global.environment = {
                    reactNative: Platform.OS,
                    android: Platform.OS === "android",
                    ios: Platform.OS === "ios",
                };
                // Make all test related modules reinitialize
                const modules = require.getModules();
                for (const [_id, m] of Object.entries(modules)) {
                    if (
                        m.verboseName.indexOf("realm-integration-tests") !== -1
                    ) {
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
            onRunning: runner => {
                this.setState({
                    status: "running",
                    failures: 0,
                    currentTestIndex: 0,
                });
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
                });
            },
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
    status: {
        fontSize: 20,
        textAlign: "center",
        margin: 10,
    },
    details: {
        fontSize: 14,
        textAlign: "center",
        margin: 10,
    },
});
