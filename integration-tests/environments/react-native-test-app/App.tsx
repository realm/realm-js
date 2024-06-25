////////////////////////////////////////////////////////////////////////////
//
// Copyright 2024 Realm Inc.
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
import React from "react";
import { StyleSheet, View, SafeAreaView, StatusBar, Platform } from "react-native";

import { MochaRemoteProvider, ConnectionText, StatusEmoji, StatusText, CustomContext } from "mocha-remote-react-native";

// Registering an error handler that always throw unhandled exceptions
// This is to enable the remote-mocha-cli to exit on uncaught errors
const originalHandler = ErrorUtils.getGlobalHandler();
ErrorUtils.setGlobalHandler((err, isFatal) => {
  // Calling the original handler to show the error visually too
  originalHandler(err, isFatal);
  throw err;
});

function loadTests(context: CustomContext) {
  describe("harness", () => {
    it("runs", () => {});
  });
  // /* eslint-env mocha */
  // // Quick sanity check that "realm" is loadable at all
  // require("realm");
  // /* eslint-disable-next-line no-restricted-globals */
  // Object.assign(globalThis, {
  //   fs: require("react-native-fs"),
  //   path: require("path-browserify"),
  //   environment: {
  //     // Default to the host machine when running on Android
  //     baseUrl: Platform.OS === "android" ? "http://10.0.2.2:9090" : undefined,
  //     ...context,
  //     // TODO: Incorporate this into the Mocha context instead
  //     reactNative: Platform.OS,
  //     android: Platform.OS === "android",
  //     ios: Platform.OS === "ios",
  //   },
  // });
  // // Make the tests reinitializable, to allow test running on changes to the "realm" package
  // // Probing the existance of `getModules` as this only exists in debug mode
  // // if ("getModules" in require) {
  // //   const modules = require.getModules();
  // //   for (const [, m] of Object.entries(modules)) {
  // //     if (m.verboseName.startsWith("../../tests/")) {
  // //       m.isInitialized = false;
  // //     }
  // //   }
  // // }
  // // Require in the integration tests
  // require("@realm/integration-tests");
}

export default function App() {
  return (
    <MochaRemoteProvider tests={loadTests}>
      <StatusBar hidden />
      <SafeAreaView style={styles.container}>
        <ConnectionText style={styles.connectionText} />
        <View style={styles.statusContainer}>
          <StatusEmoji style={styles.statusEmoji} />
          <StatusText style={styles.statusText} />
        </View>
      </SafeAreaView>
    </MochaRemoteProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  statusContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statusEmoji: {
    fontSize: 30,
    margin: 30,
    textAlign: "center",
  },
  statusText: {
    fontSize: 20,
    margin: 20,
    textAlign: "center",
  },
  connectionText: {
    textAlign: "center",
  },
});
