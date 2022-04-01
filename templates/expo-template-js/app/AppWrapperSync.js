import React, { useCallback, useRef, useState } from "react";
import { Realm } from "@realm/react";
import { Pressable, SafeAreaView, StyleSheet, Text } from "react-native";

import { TaskRealmContext } from "./models";
import { LoginScreen, AuthState } from "./components/LoginScreen";
import colors from "./styles/colors";
import { AppSync } from "./AppSync";
import { buttonStyles } from "./styles/button";
import { shadows } from "./styles/shadows";

export const AppWrapperSync = ({ appId }) => {
  const { RealmProvider } = TaskRealmContext;

  // Set up the Realm app
  const app = useRef(new Realm.App({ id: appId })).current;

  // Store the logged in user in state so that we know when to render the login screen and
  // when to render the app. This will be null the first time you start the app, but on future
  // startups, the logged in user will persist.
  const [user, setUser] = useState(app.currentUser);

  const [authState, setAuthState] = useState(AuthState.None);
  const [authVisible, setAuthVisible] = useState(false);

  // If the user presses "login" from the auth screen, try to log them in
  // with the supplied credentials
  const handleLogin = useCallback(
    async (email, password) => {
      setAuthState(AuthState.Loading);
      const credentials = Realm.Credentials.emailPassword(email, password);

      try {
        setUser(await app.logIn(credentials));
        setAuthVisible(false);
        setAuthState(AuthState.None);
      } catch (e) {
        console.log("Error logging in", e);
        setAuthState(AuthState.LoginError);
      }
    },
    [setAuthState, setUser, setAuthVisible, app],
  );

  // If the user presses "register" from the auth screen, try to register a
  // new account with the  supplied credentials and login as the newly created user
  const handleRegister = useCallback(
    async (email, password) => {
      setAuthState(AuthState.Loading);

      try {
        // Register the user...
        await app.emailPasswordAuth.registerUser({ email, password });
        // ...then login with the newly created user
        const credentials = Realm.Credentials.emailPassword(email, password);

        setUser(await app.logIn(credentials));
        setAuthVisible(false);
        setAuthState(AuthState.None);
      } catch (e) {
        console.log("Error registering", e);
        setAuthState(AuthState.RegisterError);
      }
    },
    [setAuthState, app],
  );

  // If the user presses "logout", unset the user in state and log the user out
  // of the Realm app
  const handleLogout = useCallback(() => {
    setUser(null);
    app.currentUser?.logOut();
  }, [setUser, app]);

  // If we are not logged in show the login screen
  if (authVisible || !user || !app.currentUser) {
    return <LoginScreen onLogin={handleLogin} onRegister={handleRegister} authState={authState} />;
  }

  // If we are logged in, add the sync configuration the the RealmProvider and render the app
  return (
    <SafeAreaView style={styles.screen}>
      <RealmProvider sync={{ user, flexible: true }}>
        <AppSync userId={app.currentUser.id} />
        <Pressable style={styles.authButton} onPress={handleLogout}>
          <Text style={styles.authButtonText}>Logout {app.currentUser.profile.email}</Text>
        </Pressable>
      </RealmProvider>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.darkBlue,
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

export default AppWrapperSync;
