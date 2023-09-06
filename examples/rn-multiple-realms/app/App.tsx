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
import {StatusBar, StyleSheet, View} from 'react-native';
import {OpenRealmBehaviorType} from 'realm';
import {AppProvider, RealmProvider, UserProvider} from '@realm/react';

import {ATLAS_APP_ID} from './atlas-app-services/config';
import {AnonymousLogin} from './components/AnonymousLogin';
import {Loading} from './components/Loading';
import {Movie} from './models/Movie';
import {MovieProvider} from './providers/MovieProvider';
import {RootNavigator} from './navigation/RootNavigator';

function App() {
  return (
    <View style={styles.container}>
      <Loading duration={3500} />
      <StatusBar animated barStyle="light-content" />
      <AppProvider id={ATLAS_APP_ID}>
        {/* The component set as the `fallback` prop will be rendered if a user has not been
        authenticated. In this case, we will log in as an anonymous user. Once authenticated,
        `RealmProvider` will have access to the user and set it in the Realm configuration;
        therefore, you do not have to explicitly provide the user here. */}
        <UserProvider fallback={AnonymousLogin}>
          <RealmProvider
            schema={[Movie]}
            sync={{
              flexible: true,
              // Subscribe to all movies in order to sync them to the device.
              initialSubscriptions: {
                update: (mutableSubs, realm) => {
                  mutableSubs.add(realm.objects(Movie), {name: 'allMovies'});
                },
              },
              // We can specify the behavior when opening a realm for the first time
              // (`newRealmFileBehavior`) and for subsequent ones (`existingRealmFileBehavior`).
              // If the user has logged in at least 1 time before, the realm and its data will
              // exist on disk and can be opened even when offline. We can either create a new
              // empty realm file and sync the data to the device in the background
              // (`OpenRealmBehaviorType.OpenImmediately`), or wait for the data to be fully
              // synced (`OpenRealmBehaviorType.DownloadBeforeOpen`).
              newRealmFileBehavior: {
                type: OpenRealmBehaviorType.OpenImmediately,
              },
              existingRealmFileBehavior: {
                type: OpenRealmBehaviorType.OpenImmediately,
              },
            }}>
            <MovieProvider>
              <RootNavigator />
            </MovieProvider>
          </RealmProvider>
        </UserProvider>
      </AppProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
