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
import {RealmProvider} from '@realm/react';

import {AppNonSync} from './AppNonSync';
import {colors} from './styles/colors';
import {schemas} from './models';

/**
 * The root React component for the local-only app which renders
 * `@realm/react`'s `RealmProvider` for opening a Realm.
 */
export const AppWrapperNonSync = () => {
  return (
    <SafeAreaView style={styles.screen}>
      {/* Define the Realm configuration as props passed to `RealmProvider`.
      Since this component renders the local-only app, there is no need to
      set up `AppProvider` or `UserProvider`. */}
      <RealmProvider schema={schemas}>
        <AppNonSync />
      </RealmProvider>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.darkBlue,
  },
});
