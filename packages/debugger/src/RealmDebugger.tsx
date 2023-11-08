import React from "react";
import { Text, StyleSheet, View } from "react-native";
import { useRealm } from "@realm/react";

import { RealmBrowser } from "./RealmBrowser/RealmBrowser";

// TODO: Check if there's an app context or have the user input it

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  missingRealmText: {
    textAlign: "center",
  },
});

export function RealmDebugger() {
  const realm = useRealm(false);
  return (
    <View style={styles.container}>
      {realm ? (
        <RealmBrowser />
      ) : (
        <Text style={styles.missingRealmText}>
          Expected the {"<RealmDebugger />"} the be a descendant of a {"<RealmProvider />"}
        </Text>
      )}
    </View>
  );
}
