import React, { useState, useEffect } from "react";
import { Button, StyleSheet, Text, View } from "react-native";
import { useRealm } from "@realm/react";
import json5 from "json5";

import { SafeAreaModal } from "../SafeAreaModal";
import { JsonInput, JsonResult } from "./JsonInput";
import { transformValues } from "./utils";

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

export type EditObjectModalProps = {
  object: Realm.Object<any> | undefined;
  onEdit: () => void;
  onCancel: () => void;
};

export function EditObjectModal({ object, onEdit, onCancel }: EditObjectModalProps) {
  const realm = useRealm();
  const [[code, error], setJsonResult] = useState<JsonResult>(() => {
    return [json5.stringify(object, null, 2), undefined];
  });
  const visible = !!object;
  const objectSchema = object ? object.objectSchema() : undefined;

  useEffect(() => {
    setJsonResult([json5.stringify(object, null, 2), undefined]);
  }, [object]);

  function handleSave() {
    const values = json5.parse(code);
    if (objectSchema) {
      realm.write(() => {
        const transformedValues = transformValues(Object.values(objectSchema.properties), values);
        Object.assign<any, any>(object, transformedValues);
      });
    } else {
      throw new Error("Expected a selected object schema");
    }
    onEdit();
  }

  function handleCancel() {
    setJsonResult(["{\n\n}", undefined]);
    onCancel();
  }

  function handleChangeText(newCode: string, newError: string | undefined) {
    setJsonResult([newCode, newError]);
  }

  const requiredPropertyNames = Object.entries(objectSchema ? objectSchema.properties : {})
    .filter(([, property]) => !property.optional && property.type !== "list")
    .map(([name]) => name);

  return (
    <SafeAreaModal visible={visible}>
      <Text style={styles.hint}>{error || "Click 'Save'"}</Text>
      <JsonInput
        style={styles.input}
        code={code}
        requiredPropertyNames={requiredPropertyNames}
        onChange={handleChangeText}
      />
      <View style={styles.controls}>
        <Button title="Cancel" onPress={handleCancel} />
        <Button title="Save" onPress={handleSave} disabled={!!error} />
      </View>
    </SafeAreaModal>
  );
}
