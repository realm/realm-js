////////////////////////////////////////////////////////////////////////////
//
// Copyright 2023 Realm Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
////////////////////////////////////////////////////////////////////////////

import React from 'react';
import {SafeAreaView, StyleSheet} from 'react-native';
import {OpenRealmBehaviorType} from 'realm';
import {AppProvider, RealmProvider, UserProvider} from '@realm/react';

import {Loading} from './components/Loading';
import {LoginScreen} from './screens/LoginScreen';
import {Task} from './models/Task';
import {TaskScreenSync} from './screens/TaskScreenSync';
import {colors} from './styles/colors';
import {schemas} from './models';

type AppSyncProps = {
  appId: string;
};

/**
 * The root React component for the Device Sync enabled app which renders
 * `@realm/react`'s `AppProvider` for instantiation an Atlas App Services
 * App, `UserProvider` for providing the App User once authenticated, and
 * `RealmProvider` for opening a Realm.
 */
export function AppSync({appId}: AppSyncProps) {
  return (
    <SafeAreaView style={styles.screen}>
      <AppProvider id={appId}>
        {/* The component set as the `fallback` prop will be rendered if a user has
        not been authenticated. In this case, we will show the login screen. */}
        <UserProvider fallback={<LoginScreen />}>
          {/* Define the Realm configuration as props passed to `RealmProvider`.
          Note that `user` does not need to be defined in the `sync` config
          since the `RealmProvider` will set it for you once authenticated. */}
          <RealmProvider
            // The fallback component will be rendered until the realm is opened.
            fallback={Loading}
            schema={schemas}
            sync={{
              flexible: true,
              // To sync data to the device, we need to subscribe to our tasks.
              initialSubscriptions: {
                update: (mutableSubs, realm) =>
                  mutableSubs.add(realm.objects(Task), {name: 'myTasks'}),
              },
              // We can specify the behavior when opening a Realm for the first time
              // (`newRealmFileBehavior`) and for subsequent ones (`existingRealmFileBehavior`).
              // If the user has logged in at least 1 time before, the Realm and its data will
              // exist on disk and can be opened even when offline. We can either (a) open the
              // Realm immediately (or first create a new empty Realm file if it does not
              // exist before opening it) and sync the data to the device in the background
              // (`OpenRealmBehaviorType.OpenImmediately`), or (b) wait for any non-synced
              // data to be fully downloaded (`OpenRealmBehaviorType.DownloadBeforeOpen`).
              // For more possible configurations of new and existing Realm file behaviors, see:
              // https://www.mongodb.com/docs/realm-sdks/js/latest/types/OpenRealmBehaviorConfiguration.html
              newRealmFileBehavior: {
                type: OpenRealmBehaviorType.DownloadBeforeOpen,
              },
              existingRealmFileBehavior: {
                type: OpenRealmBehaviorType.OpenImmediately,
              },
            }}>
            <TaskScreenSync />
          </RealmProvider>
        </UserProvider>
      </AppProvider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.white,
  },
});
