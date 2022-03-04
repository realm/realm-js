////////////////////////////////////////////////////////////////////////////
//
// Copyright 2022 Realm Inc.
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

import React, {useEffect, useRef, useState} from 'react';
import {Realm} from '@realm/react';
import {StyleSheet, View} from 'react-native';

import TaskContext from './models/Task';
import LoginScreen from './components/LoginScreen';
import {SYNC_CONFIG} from './config/sync';
import colors from './styles/colors';
import {App} from './App';

export let AuthState;

(function (AuthState) {
  AuthState[(AuthState['None'] = 0)] = 'None';
  AuthState[(AuthState['Loading'] = 1)] = 'Loading';
  AuthState[(AuthState['LoginError'] = 2)] = 'LoginError';
  AuthState[(AuthState['RegisterError'] = 3)] = 'RegisterError';
})(AuthState || (AuthState = {}));
function AppWrapperNonSync() {
  const {RealmProvider} = TaskContext;

  // If sync is disabled, setup the app without any sync functionality and return early
  return (
    <RealmProvider>
      <App syncEnabled={false} />
    </RealmProvider>
  );
}

function AppWrapperSync() {
  const {RealmProvider} = TaskContext;

  // Set up the Realm app
  const app = useRef(new Realm.App({id: SYNC_CONFIG.realmAppId})).current;

  // Store the logged in user in state so that we know when to render the login screen and
  // when to render the app. This will be null the first time you start the app, but on future
  // startups, the logged in user will persist.
  const [user, setUser] = useState(app.currentUser);

  const [authState, setAuthState] = useState(AuthState.None);
  const [authVisible, setAuthVisible] = useState(false);

  // If the user presses "login", show the auth screen
  const handleShowAuth = () => {
    setAuthVisible(true);
  };

  // If the user presses "login" from the auth screen, try to log them in
  // with the supplied credentials
  const handleLogin = async (email, password) => {
    setAuthState(AuthState.Loading);
    const credentials = Realm.Credentials.emailPassword(email, password);

    try {
      setUser(await app.logIn(credentials));
      setAuthVisible(false);
      setAuthState(AuthState.None);
    } catch (e) {
      console.log('Error logging in', e);
      setAuthState(AuthState.LoginError);
    }
  };

  // If the user presses "register" from the auth screen, try to register a
  // new account with the  supplied credentials and login as the newly created user
  const handleRegister = async (email, password) => {
    setAuthState(AuthState.Loading);

    try {
      // Register the user...
      await app.emailPasswordAuth.registerUser({email, password});
      // ...then login with the newly created user
      const credentials = Realm.Credentials.emailPassword(email, password);

      setUser(await app.logIn(credentials));
      setAuthVisible(false);
      setAuthState(AuthState.None);
    } catch (e) {
      console.log('Error registering', e);
      setAuthState(AuthState.RegisterError);
    }
  };

  // If the user presses "logout", unset the user in state and log the user out
  // of the Realm app
  const handleLogout = () => {
    setUser(null);
    app.currentUser?.logOut();
  };

  // If anonymous auth is enabled and no user is logged in, log in as an anonymous user
  useEffect(() => {
    if (user || !SYNC_CONFIG.anonymousAuthEnabled) {
      return;
    }

    (async () => {
      const credentials = Realm.Credentials.anonymous();
      try {
        setUser(await app.logIn(credentials));
      } catch (e) {
        console.log('Error logging in anonymous user', e);
        throw e;
      }
    })();
  }, [user, app]);

  // Return null if we are waiting for anonymous login to complete
  if ((!user || !app.currentUser) && SYNC_CONFIG.anonymousAuthEnabled) {
    return null;
  }

  // If we are not logged in, or the user has pressed "Login" as an anonymous user,
  // show the login screen
  if (authVisible || !user || !app.currentUser) {
    return (
      <LoginScreen
        onLogin={handleLogin}
        onRegister={handleRegister}
        authState={authState}
      />
    );
  }

  // If we are logged in, add the sync configuration the the RealmProvider and render the app
  return (
    <RealmProvider sync={{user, partitionValue: app.currentUser.id}}>
      <App
        syncEnabled={true}
        onLogin={
          SYNC_CONFIG.anonymousAuthEnabled && user.providerType === 'anon-user'
            ? handleShowAuth
            : undefined
        }
        onLogout={user.providerType === 'anon-user' ? undefined : handleLogout}
        currentUserId={app.currentUser.id}
        currentUserName={
          user.providerType === 'anon-user'
            ? 'Anonymous'
            : app.currentUser.profile.email
        }
      />
    </RealmProvider>
  );
}

export default function AppWrapper() {
  // Wrap the app with a background colour to prevent a flash of white while sync is
  // initialising causing RealmProvider to return null
  return (
    <View style={styles.screen}>
      {SYNC_CONFIG.enabled ? <AppWrapperSync /> : <AppWrapperNonSync />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.darkBlue,
  },
});
