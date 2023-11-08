import React from "react";
import { Text, StyleSheet, Platform, Pressable } from "react-native";
import Realm from "realm";
import json5 from "json5";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderColor: "#ddd",
  },
  pressed: {
    backgroundColor: "#eee",
  },
  text: {
    fontFamily: Platform.select({
      ios: "Courier New",
      default: "monospace",
    }),
  },
  controls: {
    flexDirection: "row",
  },
});

export type ObjectRowProps = {
  object: Realm.Object<any>;
  onPress: () => void;
};

export function ObjectRow({ object, onPress }: ObjectRowProps) {
  return (
    <Pressable
      style={({ pressed }) => (pressed ? [styles.container, styles.pressed] : [styles.container])}
      onPress={onPress}
    >
      <Text style={styles.text}>{json5.stringify(object, null, 2)}</Text>
    </Pressable>
  );
}
