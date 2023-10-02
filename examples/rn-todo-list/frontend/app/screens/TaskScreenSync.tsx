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
import {Pressable, StyleSheet, Text} from 'react-native';
import {useApp, useAuth, useUser} from '@realm/react';

import {OfflineModeButton} from '../components/OfflineModeButton';
import {TaskScreen} from './TaskScreen';
import {buttonStyles} from '../styles/button';
import {colors} from '../styles/colors';
import {shadows} from '../styles/shadows';

/**
 * Displays the list of tasks as well as buttons for performing
 * sync-related operations.
 *
 * @note
 * This screen is only meant to be used for the Device Sync enabled
 * part of the app (`AppSync.tsx`).
 */
export function TaskScreenSync() {
  const app = useApp();
  const user = useUser();
  const {logOut} = useAuth();

  return (
    <>
      <Text style={styles.idText}>Syncing with app id: {app.id}</Text>
      <TaskScreen />
      <Pressable style={styles.authButton} onPress={logOut}>
        <Text
          style={
            styles.authButtonText
          }>{`Log out ${user?.profile.email}`}</Text>
      </Pressable>
      <OfflineModeButton />
    </>
  );
}

const styles = StyleSheet.create({
  idText: {
    color: '#999',
    paddingHorizontal: 20,
  },
  authButton: {
    ...buttonStyles.button,
    ...shadows,
    backgroundColor: colors.purpleDark,
  },
  authButtonText: {
    ...buttonStyles.text,
  },
});
