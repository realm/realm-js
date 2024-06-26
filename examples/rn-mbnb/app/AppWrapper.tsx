import React from "react";
import { Platform, SafeAreaView, StyleSheet } from "react-native";
import { OpenRealmBehaviorType } from "realm";
import { AppProvider, UserProvider } from "@realm/react";

import { AnonAuth } from "./AnonAuth";
import { AirbnbList } from "./AirbnbList";
import { SyncedRealmProvider } from "./syncedRealm";
import { LocalRealmProvider } from "./localRealm";

export const AppWrapper: React.FC<{
  appId: string;
}> = ({ appId }) => {
  // If we are logged in, the RealmProviders and the app will be rendered,
  // using the sync configuration for the `SyncedRealmProvider`.
  return (
    <>
      <SafeAreaView style={styles.screen}>
        <AppProvider id={appId}>
          <UserProvider fallback={<AnonAuth />}>
            <SyncedRealmProvider
              shouldCompact={() => true}
              sync={{
                flexible: true,
                onError: (_, error) => {
                  // Comment out to hide errors
                  console.error(error);
                },
                existingRealmFileBehavior: {
                  type: OpenRealmBehaviorType.OpenImmediately,
                },
              }}
            >
              <LocalRealmProvider>
                <AirbnbList />
              </LocalRealmProvider>
            </SyncedRealmProvider>
          </UserProvider>
        </AppProvider>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    marginTop: Platform.OS === "android" ? 30 : 0,
  },
});

export default AppWrapper;
