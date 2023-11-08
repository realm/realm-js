import React, { useState } from "react";
import { Button, StyleSheet, Text, View } from "react-native";
import json5 from "json5";
import { CanonicalObjectSchema } from "realm";
import { useRealm } from "@realm/react";

import { SafeAreaModal } from "../SafeAreaModal";
import { JsonInput, JsonResult } from "./JsonInput";

const styles = StyleSheet.create({
  hint: {
    alignContent: "flex-start",
    color: "gray",
    flexBasis: 20,
  },
  input: {
    flexGrow: 1,
  },
  controls: {
    flex: 1,
    flexGrow: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    flexBasis: 45,
  },
});

export type Values = Record<string, unknown>;

export type CreateObjectModalProps = {
  visible: boolean;
  objectSchema: CanonicalObjectSchema;
  onCreate: () => void;
  onCancel: () => void;
};

export function CreateObjectModal({ visible, objectSchema, onCreate, onCancel }: CreateObjectModalProps) {
  const realm = useRealm();
  const [[code, error], setJsonResult] = useState<JsonResult>(["{\n\n}", undefined]);

  function handleCreate() {
    const values = json5.parse(code);
    if (objectSchema) {
      realm.write(() => {
        realm.create(objectSchema.name, values);
      });
    } else {
      throw new Error("Expected a selected object schema");
    }
    onCreate();
  }

  function handleCancel() {
    setJsonResult(["{\n\n}", undefined]);
    onCancel();
  }

  function handleChangeText(newCode: string, newError: string | undefined) {
    setJsonResult([newCode, newError]);
  }

  const requiredPropertyNames = Object.entries(objectSchema.properties)
    .filter(([, property]) => !property.optional && property.type !== "list")
    .map(([name]) => name);

  return (
    <SafeAreaModal visible={visible}>
      <Text style={styles.hint}>{error || "Click 'Create'"}</Text>
      <JsonInput
        style={styles.input}
        code={code}
        requiredPropertyNames={requiredPropertyNames}
        onChange={handleChangeText}
      />
      <View style={styles.controls}>
        <Button title="Cancel" onPress={handleCancel} />
        <Button title="Create" onPress={handleCreate} disabled={!!error} />
      </View>
    </SafeAreaModal>
  );
}
