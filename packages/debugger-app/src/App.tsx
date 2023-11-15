import { View, StyleSheet } from 'react-native';

import { RealmProvider, AppProvider } from "@realm/react";
import { RealmDebugger } from '@realm/debugger';

import { DebuggerRealmProvider } from "./realm";

const styles = StyleSheet.create({
  container: {
    flex: 1
  }
});

export default function App() {
  return (
    <DebuggerRealmProvider>
      <View style={styles.container}>
        <RealmProvider>
          <RealmDebugger />
        </RealmProvider>
      </View>
    </DebuggerRealmProvider>
  );
}
