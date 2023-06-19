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
import React from "react";
import { AppProvider } from "../AppProvider";
import { renderHook, act } from "@testing-library/react-native";

import { AppConfigBuilder } from "@realm/app-importer";
import { App } from "realm";
import { useEmailPasswordAuth } from "../useEmailPasswordAuth";
import { baseUrl, importApp, testAuthOperation } from "./helpers";

function renderEmailPasswordAuth(appId: string, baseUrl: string) {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AppProvider id={appId} baseUrl={baseUrl}>
      {children}
    </AppProvider>
  );
  return renderHook(() => useEmailPasswordAuth(), { wrapper });
}

describe("useEmailPassword", () => {
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
    it("can register and login with email/password", async () => {
      const { result } = renderEmailPasswordAuth(appId, baseUrl);
      await testAuthOperation({
        authOperation: () => result.current.register({ email: "test2@test.com", password: "password" }),
        expectedResult: () => {
          expect(result.current.result.success).toEqual(true);
        },
      });

      await testAuthOperation({
        authOperation: () => result.current.logIn({ email: "test2@test.com", password: "password" }),
        expectedResult: () => {
          expect(result.current.result.success).toEqual(true);
        },
      });

      // Get an instance of the realm app and make sure the current user has been set
      const realmApp = new App({ id: appId, baseUrl });
      const user = realmApp.currentUser;
      expect(user).not.toBeNull();

      await act(async () => {
        await result.current.logOut();
      });
      expect(realmApp.currentUser).toBeNull();
    });
    it("sets an error state when user is already registered", async () => {
      const { result } = renderEmailPasswordAuth(appId, baseUrl);
      await testAuthOperation({
        authOperation: () => result.current.register({ email: "test2@test.com", password: "password" }),
        expectedResult: () => {
          expect(result.current.result.error).toBeDefined();
        },
      });
    });
    it("can switch users", async () => {
      const { result } = renderEmailPasswordAuth(appId, baseUrl);

      await testAuthOperation({
        authOperation: () => result.current.register({ email: "user1@user.com", password: "password" }),
        expectedResult: () => {
          expect(result.current.result.success).toEqual(true);
        },
      });

      await testAuthOperation({
        authOperation: () => result.current.register({ email: "user2@user.com", password: "password" }),
        expectedResult: () => {
          expect(result.current.result.success).toEqual(true);
        },
      });

      await testAuthOperation({
        authOperation: () => result.current.logIn({ email: "user1@user.com", password: "password" }),
        expectedResult: () => {
          expect(result.current.result.success).toEqual(true);
        },
      });

      let realmApp = new App({ id: appId, baseUrl });
      const firstUserId = realmApp.currentUser?.id;

      await testAuthOperation({
        authOperation: () => result.current.logIn({ email: "user2@user.com", password: "password" }),
        expectedResult: () => {
          expect(result.current.result.success).toEqual(true);
        },
      });

      realmApp = new App({ id: appId, baseUrl });
      const user = realmApp.currentUser;
      expect(user?.id).not.toEqual(firstUserId);
    });
  });
  describe("all methods are callable and report a state", () => {
    let appId: string;
    beforeAll(async () => {
      const config = new AppConfigBuilder("test-app-2");
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
    it("logIn", async () => {
      const { result } = renderEmailPasswordAuth(appId, baseUrl);
      await testAuthOperation({
        authOperation: () => result.current.logIn({ email: "test@test.com", password: "password" }),
        expectedResult: () => expect(result.current.result.error).toBeDefined(),
      });
    });
    it("register", async () => {
      const { result } = renderEmailPasswordAuth(appId, baseUrl);
      await testAuthOperation({
        authOperation: () => result.current.register({ email: "test@test.com", password: "password" }),
        expectedResult: () => expect(result.current.result.success).toBe(true),
      });
    });
    it("confirm", async () => {
      const { result } = renderEmailPasswordAuth(appId, baseUrl);
      await testAuthOperation({
        authOperation: () => result.current.confirm({ token: "1234", tokenId: "4321" }),
        expectedResult: () => expect(result.current.result.error).toBeDefined(),
      });
    });
    it("resendConfirmationEmail", async () => {
      const { result } = renderEmailPasswordAuth(appId, baseUrl);
      await testAuthOperation({
        authOperation: () => result.current.resendConfirmationEmail({ email: "test@test.com" }),
        expectedResult: () => expect(result.current.result.error).toBeDefined(),
      });
    });
    it("retryCustomConfirmation", async () => {
      const { result } = renderEmailPasswordAuth(appId, baseUrl);
      await testAuthOperation({
        authOperation: () => result.current.retryCustomConfirmation({ email: "test@test.com" }),
        expectedResult: () => expect(result.current.result.error).toBeDefined(),
      });
    });
    it("sendResetPasswordEmail", async () => {
      const { result } = renderEmailPasswordAuth(appId, baseUrl);
      await testAuthOperation({
        authOperation: () => result.current.sendResetPasswordEmail({ email: "test@test.com" }),
        expectedResult: () => expect(result.current.result.error).toBeDefined(),
      });
    });
    it("resetPassword", async () => {
      const { result } = renderEmailPasswordAuth(appId, baseUrl);
      await testAuthOperation({
        authOperation: () => result.current.resetPassword({ token: "1234", tokenId: "4321", password: "newpassword" }),
        expectedResult: () => expect(result.current.result.error).toBeDefined(),
      });
    });
    it("callResetPasswordFunction", async () => {
      const { result } = renderEmailPasswordAuth(appId, baseUrl);
      await testAuthOperation({
        authOperation: () =>
          result.current.callResetPasswordFunction({ email: "test@test.com", password: "password" }, { foo: "bar" }),
        expectedResult: () => expect(result.current.result.error).toBeDefined(),
      });
    });
    it("logOut", async () => {
      const { result } = renderEmailPasswordAuth(appId, baseUrl);
      await testAuthOperation({
        authOperation: () => result.current.logOut(),
        expectedResult: () => expect(result.current.result.success).toBeTruthy(),
      });
    });
  });
});
