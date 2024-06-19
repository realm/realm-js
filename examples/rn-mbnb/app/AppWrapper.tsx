import React from "react";
import { AppProvider, UserProvider } from "@realm/react";
import { Platform, SafeAreaView, StyleSheet } from "react-native";
import { AnonAuth } from "./AnonAuth";
import { AirbnbList } from "./AirbnbList";
import { SyncedRealmProvider } from "./syncedRealm";
import { LocalRealmProvider } from "./localRealm";
import { OpenRealmBehaviorType } from "realm";

export const AppWrapper: React.FC<{
  appId: string;
}> = ({ appId }) => {
  // If we are logged in, add the sync configuration the the RealmProvider and render the app
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
                  // Uncomment to make errors visible
                  // console.error(error);
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
