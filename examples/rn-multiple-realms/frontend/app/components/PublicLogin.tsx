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

import React, {useEffect} from 'react';
import {StyleSheet, View} from 'react-native';
import {useApp, useAuth} from '@realm/react';

import {colors} from '../styles/colors';

/**
 * Component used solely for logging in which is used where only components
 * are expected (such as the `fallback` prop of `@realm/react`'s `UserProvider`).
 * This logs a user in using Anonymous Authentication. To read more, see:
 * {@link https://www.mongodb.com/docs/atlas/app-services/authentication/anonymous/}.
 *
 * @note
 * Another alternative for representing a "public" user could be to use the
 * same email/password credentials for such users which could be stored among
 * environment variables. This way, a new App user is not created for each login.
 * You would then need to modify the backend to not create `PrivateContent`
 * documents for these users, and refactor code relying on public users using
 * anonymous authentication.
 */
export function PublicLogin() {
  const atlasApp = useApp();
  const {logInWithAnonymous, result} = useAuth();

  useEffect(() => {
    // Log in as an anonymous user if there is not a logged in user yet. Also
    // check `!result.pending` to prevent simultaneous authentication operations.
    if (!atlasApp.currentUser && !result.pending) {
      logInWithAnonymous();
    }
  }, [atlasApp.currentUser, logInWithAnonymous, result.pending]);

  return <View style={styles.container} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
});
