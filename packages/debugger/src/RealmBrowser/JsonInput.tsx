import React from "react";
import { TextInput, StyleSheet, TextInputProps, Platform } from "react-native";
import json5 from "json5";

const styles = StyleSheet.create({
  input: {
    padding: 5,
    fontFamily: Platform.select({
      ios: "Courier New",
      default: "monospace",
    }),
  },
});

export type CodeInputProps = {
  code: string;
  onChange(code: string, err: string | undefined): void;
  requiredPropertyNames: string[];
} & Omit<TextInputProps, "value" | "onChangeText" | "onChange">;

export type JsonResult = [string, string | undefined];

export function JsonInput({ code, onChange, requiredPropertyNames, ...rest }: CodeInputProps) {
  function handleChangeText(value: string) {
    const cleanCode = value.replaceAll("“", '"').replaceAll("”", '"').replaceAll("’", "'");

    try {
      const values = json5.parse(value);
      const usedProperties = Object.keys(values);
      const missingProperties = requiredPropertyNames.filter((name) => {
        return !usedProperties.includes(name);
      });
      if (missingProperties.length > 0) {
        onChange(cleanCode, `Missing properties: ${missingProperties.map((name) => name)}`);
      } else {
        onChange(cleanCode, undefined);
      }
    } catch (err) {
      return onChange(cleanCode, err instanceof Error ? err.message : `${err}`);
    }
  }

  return (
    <TextInput
      style={styles.input}
      value={code}
      onChangeText={handleChangeText}
      autoFocus={true}
      multiline={true}
      numberOfLines={10}
      autoCapitalize={"none"}
      autoCorrect={false}
      spellCheck={false}
      selectTextOnFocus={false}
      {...rest}
    />
  );
}
