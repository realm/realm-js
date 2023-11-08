import React, { useEffect } from "react";
import { StyleSheet, View, Button } from "react-native";
import { useRealm } from "@realm/react";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexGrow: 0,
    flexDirection: "row",
    /* TODO: Could this be driven by the height of the buttons? */
    flexBasis: 45,
    borderBottomWidth: 0.5,
  },
});

export type ClassSelectorProps = {
  value: string | undefined;
  onChange: (value: string) => void;
};

export function ClassSelector({ value, onChange }: ClassSelectorProps) {
  const realm = useRealm();
  // Sort the object schemas to make the last
  const objectSchemas = realm.schema.sort((a, b) => {
    if (!a.embedded && b.embedded) {
      return -1;
    } else {
      return a.name.localeCompare(b.name);
    }
  });

  // Select the first object schema, if none is selected
  const firstObjectSchemaName = objectSchemas.length > 0 ? objectSchemas[0].name : undefined;
  useEffect(() => {
    if (firstObjectSchemaName && !value) {
      onChange(firstObjectSchemaName);
    }
  }, [value, onChange, firstObjectSchemaName]);

  return (
    <View style={styles.container}>
      {objectSchemas.map(({ name, embedded }) => (
        <Button
          color={value === name ? "black" : undefined}
          title={name}
          key={name}
          disabled={embedded}
          onPress={() => {
            onChange(name);
          }}
        />
      ))}
    </View>
  );
}
