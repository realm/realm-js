/**
 * Sample React Native App
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
    state = { status: "waiting" };

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
        if (this.state.status === "waiting") {
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
        } else {
            return null;
        }
    }

    prepareTests() {
        this.client = new MochaRemoteClient({
            whenInstrumented: (mocha) => {
                // Setting the title of the root suite
                mocha.suite.title = `React-Native on ${Platform.OS}`;
                // Provide the global Realm constructor to the tests
                global.Realm = require("realm");
                // Require in the tests
                require("@realm-tests/tests");
            },
            whenRunning: (runner) => {
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
                    this.setState({ status: "ended" });
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
