import React, { useState, PropsWithChildren } from "react";
import { View, Text } from "react-native";

import { AppIdInput } from "./AppIdInput";

export function AppSelector({ children }: PropsWithChildren) {
  const [appId, setAppId] = useState<string | undefined>(undefined);
  return (
    <View>
      <AppIdInput onAppIdChange={setAppId} />
      <Text>{appId || "?"}</Text>
      {children}
    </View>
  );
}
