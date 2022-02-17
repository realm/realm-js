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

// 1. Move your App code to e.g. AppMain.tsx and create this outer App.tsx which is
// responsible for logging in the user and setting up sync on the Realm.

import React, { useEffect, useState } from "react";
import { Realm } from "@realm/react";

import TaskContext from "./app/models/Task";
import { AppMain } from "./AppMain";

const APP_ID = "<your app ID>";

// 2. Add your Realm app details here, using whatever login mechanism you wish
const app = new Realm.App({ id: APP_ID });
const credentials = Realm.Credentials.anonymous();

const App = () => {
  // 3. Store the logged in user in state, this will be null when you first start the app
  const [user, setUser] = useState<Realm.User | null>(app.currentUser);

  const { RealmProvider } = TaskContext;

  // 4. On application startup, login the user if not already logged in
  useEffect(() => {
    (async () => {
      if (user) return;

      const loggedInUser = await app.logIn(credentials);
      // 5. Set the logged in user in state
      setUser(loggedInUser);
    })();
  }, []);

  // 6. If we are not logged in yet, return null so the app does not render without sync enabled
  if (!user) return null;

  // 7. If we are logged in, add the sync configuration the the Realm and render the ap
  return (
    <RealmProvider sync={{ user, partitionValue: "default" }}>
      <AppMain />
    </RealmProvider>
  );
};

export default App;
