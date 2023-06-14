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
import { waitFor, renderHook, act } from "@testing-library/react-native";

import { AppConfigBuilder } from "@realm/app-importer";
import { App } from "realm";
import { useEmailPasswordAuth } from "../useEmailPasswordAuth";
import { OperationState } from "../types";
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
    it("can register and login with email/password, just by calling register", async () => {
      const { result } = renderEmailPasswordAuth(appId, baseUrl);

      await act(async () => {
        result.current.register({ email: "test@test.com", password: "password" });
        await waitFor(() => {
          expect(result.current.result.pending).toEqual(true);
        });
      });
      await waitFor(() => {
        expect(result.current.result.success).toEqual(true);
      });

      // Get an instance of the realm app and make sure the current user has been set
      const realmApp = new App({ id: appId, baseUrl });
      expect(realmApp.currentUser).not.toBeNull();
      await act(async () => {
        await result.current.logOut();
      });
      expect(realmApp.currentUser).toBeNull();
    });
    it("can register and login with email/password, just by calling register and login", async () => {
      const { result } = renderEmailPasswordAuth(appId, baseUrl);
      await act(async () => {
        result.current.register({ email: "test2@test.com", password: "password", loginAfterRegister: false });
        await waitFor(() => {
          expect(result.current.result.pending).toEqual(true);
        });
      });
      await waitFor(() => {
        expect(result.current.result.success).toEqual(true);
      });

      await act(async () => {
        result.current.logIn({ email: "test2@test.com", password: "password" });
        await waitFor(() => {
          expect(result.current.result.pending).toEqual(true);
        });
      });
      await waitFor(() => {
        expect(result.current.result.success).toEqual(true);
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

      await act(async () => {
        result.current.register({ email: "test2@test.com", password: "password", loginAfterRegister: false }),
          await waitFor(() => {
            expect(result.current.result.pending).toEqual(true);
          });
      });
      await waitFor(() => {
        expect(result.current.result.state).toBe(OperationState.Error);
        expect(result.current.result.error).toBeDefined();
      });
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
      await act(async () => {
        result.current.logIn({ email: "test@test.com", password: "password" });
        await waitFor(() => {
          expect(result.current.result.pending).toBeTruthy();
        });
      });
      await waitFor(() => {
        expect(result.current.result.error).toBeDefined();
      });
    });
    it("register", async () => {
      const { result } = renderEmailPasswordAuth(appId, baseUrl);
      await act(async () => {
        result.current.register({ email: "test@test.com", password: "password" });
        await waitFor(() => {
          expect(result.current.result.pending).toBeTruthy();
        });
      });
      await waitFor(() => {
        expect(result.current.result.success).toBeTruthy();
      });
    });
    it("confirm", async () => {
      const { result } = renderEmailPasswordAuth(appId, baseUrl);
      await act(async () => {
        result.current.confirm({ token: "1234", tokenId: "4321" });
        await waitFor(() => {
          expect(result.current.result.pending).toBeTruthy();
        });
      });
      await waitFor(() => {
        expect(result.current.result.error).toBeDefined();
      });
    });
    it("resendConfirmationEmail", async () => {
      const { result } = renderEmailPasswordAuth(appId, baseUrl);
      await act(async () => {
        result.current.resendConfirmationEmail({ email: "test@test.com" });
        await waitFor(() => {
          expect(result.current.result.pending).toBeTruthy();
        });
      });
      await waitFor(() => {
        expect(result.current.result.error).toBeDefined();
      });
    });
    it("retryCustomConfirmation", async () => {
      const { result } = renderEmailPasswordAuth(appId, baseUrl);
      await act(async () => {
        result.current.retryCustomConfirmation({ email: "test@test.com" });
        await waitFor(() => {
          expect(result.current.result.pending).toBeTruthy();
        });
      });
      await waitFor(() => {
        expect(result.current.result.error).toBeDefined();
      });
    });
    it("sendResetPasswordEmail", async () => {
      const { result } = renderEmailPasswordAuth(appId, baseUrl);
      await act(async () => {
        result.current.sendResetPasswordEmail({ email: "test@test.com" });
        await waitFor(() => {
          expect(result.current.result.pending).toBeTruthy();
        });
      });
      await waitFor(() => {
        expect(result.current.result.error).toBeDefined();
      });
    });
    it("resetPassword", async () => {
      const { result } = renderEmailPasswordAuth(appId, baseUrl);
      await act(async () => {
        result.current.resetPassword({ token: "1234", tokenId: "4321", password: "newpassword" });
        await waitFor(() => {
          expect(result.current.result.pending).toBeTruthy();
        });
      });
      await waitFor(() => {
        expect(result.current.result.error).toBeDefined();
      });
    });
    it("callResetPasswordFunction", async () => {
      const { result } = renderEmailPasswordAuth(appId, baseUrl);
      await act(async () => {
        result.current.callResetPasswordFunction({ email: "test@test.com", password: "password" }, { foo: "bar" });
        await waitFor(() => {
          expect(result.current.result.pending).toBeTruthy();
        });
      });
      await waitFor(() => {
        expect(result.current.result.error).toBeDefined();
      });
    });
    it("logOut", async () => {
      const { result } = renderEmailPasswordAuth(appId, baseUrl);
      await testAuthOperation({
        authOperation: () => result.current.logOut(),
        result,
        expectedResult: () => expect(result.current.result.success).toBeTruthy(),
      });
    });
  });
});
