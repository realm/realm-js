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

type Props = {};
export class App extends Component<Props> {
    state = { status: "disconnected" };

    componentDidMount() {
        this.prepareTests();
    }

    componentWillUnmount() {
        if (this.client) {
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
        if (this.state.status === "running") {
            const progress = `${this.state.currentTestIndex + 1}/${this.state.totalTests}`;
            return `${progress}: ${this.state.currentTest}`;
        } else if (typeof this.state.reason === 'string') {
            return this.state.reason;
        } else if (typeof this.state.failures === 'number') {
            return `${this.state.failures} failures`;
        } else {
            return null;
        }
    }

    prepareTests() {
        this.client = new MochaRemoteClient({
            id: Platform.OS,
            whenConnected: () => {
                console.log("Connected to mocha-remote-server");
                this.setState({ status: "waiting" });
            },
            whenDisconnected: ({ reason }) => {
                this.setState({ status: "disconnected", reason });
            },
            whenInstrumented: (mocha) => {
                // Setting the title of the root suite
                global.title = `React-Native on ${Platform.OS}`;
                // Provide the global Realm constructor to the tests
                global.Realm = require("realm");
                global.fs = require("react-native-fs");
                global.path = require("path-browserify");
                global.environment = {
                    reactNative: Platform.OS,
                    android: Platform.OS === "android",
                    ios: Platform.OS === "ios"
                };
                // Require in the tests
                console.log(require.cache);
                require("realm-integration-tests");
            },
            whenRunning: (runner) => {
                this.setState({
                    status: "running",
                    failures: 0,
                });
                runner.on("test", (test) => {
                    // Compute the current test index - incrementing it if we're running
                    const currentTestIndex =
                        this.state.status === "running" ? this.state.currentTestIndex + 1 : 0;
                    // Set the state to update the UI
                    this.setState({
                        status: "running",
                        currentTest: test.fullTitle(),
                        currentTestIndex,
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
