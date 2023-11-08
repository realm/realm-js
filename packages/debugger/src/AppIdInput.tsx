import React, { useState } from "react";
import { TextInput } from "react-native";

type AppIdInputProps = {
  onAppIdChange: (appId: string) => void;
};

export function AppIdInput({ onAppIdChange }: AppIdInputProps) {
  const [appId, setAppId] = useState("");
  return (
    <TextInput
      value={appId}
      onChangeText={setAppId}
      onSubmitEditing={({ nativeEvent: { text } }) => {
        onAppIdChange(text);
      }}
    />
  );
}
