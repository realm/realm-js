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

import { polyfill as polyfillReadableStream } from "react-native-polyfill-globals/src/readable-stream";
polyfillReadableStream();
import { polyfill as polyfillEncoding } from "react-native-polyfill-globals/src/encoding";
polyfillEncoding();
import { polyfill as polyfillFetch } from "react-native-polyfill-globals/src/fetch";
polyfillFetch();
import { Client } from "mocha-remote-client";
import React, { Component } from "react";
import { Button, Platform, StyleSheet, Text, View, NativeModules } from "react-native";
import { Circle } from "react-native-progress";

// Registering an error handler that always throw unhandled exceptions
// This is to enable the remote-mocha-cli to exit on uncaught errors
const originalHandler = ErrorUtils.getGlobalHandler();
ErrorUtils.setGlobalHandler((err, isFatal) => {
  // Calling the original handler to show the error visually too
  originalHandler(err, isFatal);
  throw err;
});

const engine = global.HermesInternal ? "hermes" : "jsc";

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
        <Button title="Run tests natively" disabled={status === "running"} onPress={this.handleRerunNative} />
        <Button title="Abort running the tests" disabled={status !== "running"} onPress={this.handleAbort} />
      </View>
    );
  }

  handleRerunNative = () => {
    NativeModules.DevSettings.reload();
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
    const { status, currentTest, currentTestIndex, failures, reason } = this.state;
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
      title: `React-Native on ${Platform.OS} (using ${engine})`,
      tests: (context) => {
        /* eslint-env mocha */
        // Quick sanity check that "realm" is loadable at all
        require("realm");
        // Adding an async hook before each test to allow the UI to update
        beforeEach(() => {
          return new Promise((resolve) => setTimeout(resolve, 0));
        });
        global.fs = require("react-native-fs");
        global.path = require("path-browserify");
        global.environment = {
          // Default to the host machine when running on Android
          realmBaseUrl: Platform.OS === "android" ? "http://10.0.2.2:9090" : undefined,
          ...context,
          reactNative: Platform.OS,
          android: Platform.OS === "android",
          ios: Platform.OS === "ios",
        };
        // Make the tests reinitializable, to allow test running on changes to the "realm" package
        // Probing the existance of `getModules` as this only exists in debug mode
        if ("getModules" in require) {
          const modules = require.getModules();
          for (const [, m] of Object.entries(modules)) {
            if (m.verboseName.startsWith("../../tests/")) {
              m.isInitialized = false;
            }
          }
        }
        // Require in the integration tests
        require("@realm/integration-tests");
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
      .on("running", (runner) => {
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

        runner.on("test", (test) => {
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
