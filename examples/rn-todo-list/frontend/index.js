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

// Polyfill for `crypto.getRandomValues()` used by BSON.
import 'react-native-get-random-values';
import React from 'react';
import {AppRegistry} from 'react-native';

import {AppNonSync} from './app/AppNonSync';
import {AppSync} from './app/AppSync';
import {SYNC_CONFIG} from './sync.config';
import {name as appName} from './app.json';

/**
 * Renders either the app that uses Device Sync, or the
 * one only using a local Realm.
 */
export const App = () =>
  SYNC_CONFIG.enabled ? <AppSync appId={SYNC_CONFIG.appId} /> : <AppNonSync />;

AppRegistry.registerComponent(appName, () => App);
