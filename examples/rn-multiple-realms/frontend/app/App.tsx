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
import {AppProvider, UserProvider} from '@realm/react';

import {ATLAS_APP_ID} from './atlas-app-services/config';
import {PublicLogin} from './components/PublicLogin';
import {AuthenticatedApp} from './AuthenticatedApp';

/**
 * The root React component which renders `@realm/react`'s `AppProvider`
 * for instantiation an Atlas App Services App, and `UserProvider` for
 * providing the App User once authenticated.
 */
function App() {
  return (
    <View style={styles.container}>
      <StatusBar animated barStyle="light-content" />
      <AppProvider id={ATLAS_APP_ID}>
        {/* The component set as the `fallback` prop will be rendered if a user has not
        been authenticated. In this case, we will log in as a public/anonymous user. */}
        <UserProvider fallback={PublicLogin}>
          <AuthenticatedApp />
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
