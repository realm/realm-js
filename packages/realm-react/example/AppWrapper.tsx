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

// 1. Create AppWrapper.tsx which is the entry point into your app, and is
// responsible for logging in the user and setting up sync on the Realm.

import React, { useState } from "react";
import { Realm } from "@realm/react";

import TaskContext from "./app/models/Task";
import { App } from "./App";
import LoginScreen from "./app/components/LoginScreen";

// 2. Add your Realm app ID here and create the Realm app
const APP_ID = "application-0-bzsvu";
const app = new Realm.App({ id: APP_ID });
Realm.App.Sync.setLogLevel(app, "all");

export default function AppWrapper() {
  // 3. Store the logged in user in state so that we know when to render the login screen and
  // when to render the app. This will be null the first time you start the app, but on future
  // startups, the logged in user will persist.
  const [user, setUser] = useState<Realm.User | null>(app.currentUser);

  const [loginError, setLoginError] = useState(false);
  const [loginVisible, setLoginVisible] = useState(false);

  const { RealmProvider } = TaskContext;

  const handleLogin = async (email: string, password: string) => {
    setLoginError(false);
    const credentials = Realm.Credentials.emailPassword(email, password);

    try {
      setUser(await app.logIn(credentials));
      setLoginVisible(false);
    } catch (e) {
      console.log(e);
      setLoginError(true);
    }
  };

  const handleRegister = async (email: string, password: string) => {
    setLoginError(false);

    try {
      // Register the user...
      await app.emailPasswordAuth.registerUser({ email, password });
      // ...then login with the newly created user
      const credentials = Realm.Credentials.emailPassword(email, password);
      setUser(await app.logIn(credentials));
      setLoginVisible(false);
    } catch (e) {
      console.log(e);
      setLoginError(true);
    }
  };

  const handleShowLogin = () => {
    setLoginVisible(true);
  };

  const handleLogout = () => {
    setUser(null);
    app.currentUser?.logOut();
  };

  if (loginVisible) {
    return <LoginScreen onLogin={handleLogin} onRegister={handleRegister} loginError={loginError} />;
  }

  if (!user || !app.currentUser) {
    return (
      <RealmProvider>
        <App onLogin={handleShowLogin} currentUserId="" />
      </RealmProvider>
    );
  }

  // 7. If we are logged in, add the sync configuration the the Realm and render the ap
  return (
    <RealmProvider sync={{ user, partitionValue: app.currentUser.id }}>
      <App onLogout={handleLogout} currentUserId={app.currentUser.id} />
    </RealmProvider>
  );
}
