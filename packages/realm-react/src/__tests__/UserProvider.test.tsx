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

import { renderHook, waitFor } from "@testing-library/react-native";
import { AppConfigBuilder } from "@realm/app-importer";
import Realm, { App } from "realm";
import React, { useEffect, useState } from "react";

import { AppProvider } from "../AppProvider";
import { useEmailPasswordAuth } from "../useEmailPasswordAuth";
import { baseUrl, importApp } from "./helpers";
import { AuthOperationName } from "../types";
import { UserProvider, useUser } from "../UserProvider";

const testEmail = "test@email.com";
const testPassword = "password";

// This is used to determine the initial state for user registrations.
// Ensures that subsequent tests do not register the test user again.
let userRegistered = false;

const Login = () => {
  const { register, logIn, result } = useEmailPasswordAuth();
  const [isUserRegistered, setIsUserRegistered] = useState(userRegistered);

  useEffect(() => {
    if (!isUserRegistered && !result.pending && result.operation !== AuthOperationName.Register) {
      register({ email: testEmail, password: testPassword });
    }
  }, [register, isUserRegistered, result]);

  useEffect(() => {
    if (result.success && result.operation === AuthOperationName.Register) {
      userRegistered = true;
      setIsUserRegistered(true);
    }
  }, [result]);

  useEffect(() => {
    if (isUserRegistered && !result.pending && result.operation !== AuthOperationName.LogInWithEmailPassword) {
      logIn({ email: testEmail, password: testPassword });
    }
  }, [logIn, isUserRegistered]);

  return null;
};

function renderUserProvider(appId: string, baseUrl: string) {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AppProvider id={appId} baseUrl={baseUrl}>
      <UserProvider fallback={<Login />}>{children}</UserProvider>
    </AppProvider>
  );
  return renderHook(() => useUser(), { wrapper });
}

describe("UserProvider", () => {
  describe("with auto confirm", () => {
    let appId: string;
    beforeAll(async () => {
      const config = new AppConfigBuilder("test-app");
      config.authProvider({
        name: "local-userpass",
        type: "local-userpass",
        config: {
          autoConfirm: true,
          resetPasswordUrl: "http://localhost/resetPassword",
        },
        disabled: false,
      });
      ({ appId } = await importApp(config.config));
    });
    it("it returns the current logged in user", async () => {
      const { result } = renderUserProvider(appId, baseUrl);
      await waitFor(() => expect(result.current).not.toBe(null));
    });
    it("it can login twice", async () => {
      const { result } = renderUserProvider(appId, baseUrl);
      await waitFor(() => expect(result.current).not.toBe(null));

      const { refreshToken, id } = result.current;

      const creds = Realm.Credentials.emailPassword({ email: testEmail, password: testPassword });
      const realmApp = new App({ id: appId, baseUrl });

      await realmApp.logIn(creds);

      expect(id).toEqual(realmApp?.currentUser?.id);
      expect(refreshToken).not.toEqual(realmApp?.currentUser?.refreshToken);
    });
  });
});
