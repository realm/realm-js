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
