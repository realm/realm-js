/**
 * @format
 */

import 'react-native-get-random-values';
import React from 'react';
import {AppRegistry} from 'react-native';
import {AppWrapperNonSync} from './app/AppWrapperNonSync';
import {AppWrapperSync} from './app/AppWrapperSync';
import {name as appName} from './app.json';
import {SYNC_CONFIG} from './sync.config';

const App = () =>
  SYNC_CONFIG.enabled ? (
    <AppWrapperSync appId={SYNC_CONFIG.appId} />
  ) : (
    <AppWrapperNonSync />
  );

AppRegistry.registerComponent(appName, () => App);
