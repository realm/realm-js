import 'expo-dev-client';
import 'react-native-get-random-values';
import React from 'react';
import {registerRootComponent} from 'expo'
import {AppWrapperNonSync} from './app/AppWrapperNonSync';
import {AppWrapperSync} from './app/AppWrapperSync';
import {SYNC_CONFIG} from './sync.config';

const App = () =>
  SYNC_CONFIG.enabled ? (
    <AppWrapperSync appId={SYNC_CONFIG.appId} />
  ) : (
    <AppWrapperNonSync />
  );

registerRootComponent(App);
