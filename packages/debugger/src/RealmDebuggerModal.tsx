import React, { useState } from "react";
import { DevSettings } from "react-native";

import { RealmDebugger } from "./RealmDebugger";
import { SafeAreaModal } from "./SafeAreaModal";

export function RealmDebuggerModal() {
  const [visible, setVisible] = useState(false);
  DevSettings.addMenuItem("Toggle Realm Debugger", () => {
    setVisible(!visible);
  });

  return (
    <SafeAreaModal visible={visible}>
      <RealmDebugger />
    </SafeAreaModal>
  );
}
