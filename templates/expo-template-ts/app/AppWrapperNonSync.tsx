import React from 'react';
import {SafeAreaView, StyleSheet} from 'react-native';

import {TaskRealmContext} from './models';
import colors from './styles/colors';
import {AppNonSync} from './AppNonSync';

export const AppWrapperNonSync = () => {
  const {RealmProvider} = TaskRealmContext;

  // If sync is disabled, setup the app without any sync functionality and return early
  return (
    <SafeAreaView style={styles.screen}>
      <RealmProvider>
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
