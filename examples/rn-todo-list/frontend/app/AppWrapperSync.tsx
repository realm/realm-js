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
import {AppProvider, UserProvider} from '@realm/react';
import {SafeAreaView, StyleSheet} from 'react-native';

import {schemas} from './models';
import {LoginScreen} from './components/LoginScreen';
import colors from './styles/colors';
import {AppSync} from './AppSync';

import {RealmProvider} from '@realm/react';
import {OpenRealmBehaviorType, OpenRealmTimeOutBehavior} from 'realm';

export const AppWrapperSync: React.FC<{
  appId: string;
}> = ({appId}) => {
  // If we are logged in, add the sync configuration the the RealmProvider and render the app
  return (
    <SafeAreaView style={styles.screen}>
      <AppProvider id={appId}>
        <UserProvider fallback={<LoginScreen />}>
          <RealmProvider
            schema={schemas}
            sync={{
              flexible: true,
              existingRealmFileBehavior: {
                type: OpenRealmBehaviorType.DownloadBeforeOpen,
                timeOut: 1000,
                timeOutBehavior:
                  // In v11 the enums are not set up correctly, so we need to use the string values
                  OpenRealmTimeOutBehavior?.OpenLocalRealm ?? 'openLocalRealm',
              },
            }}>
            <AppSync />
          </RealmProvider>
        </UserProvider>
      </AppProvider>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.darkBlue,
  },
});

export default AppWrapperSync;
