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
import { renderHook } from "@testing-library/react-native";

import { AppConfigBuilder } from "@realm/app-importer";
import { useAuth } from "../useAuth";
import { baseUrl, importApp, testAuthOperation } from "./helpers";

function renderAuth(appId: string, baseUrl: string) {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AppProvider id={appId} baseUrl={baseUrl}>
      {children}
    </AppProvider>
  );
  return renderHook(() => useAuth(), { wrapper });
}

// These will all fail since we haven't configured any of the auth providers
// The tests for the authentication methods themselves should be written elsewhere
describe("useAuth", () => {
  describe("all methods are callable and report a state", () => {
    let appId: string;
    beforeAll(async () => {
      const config = new AppConfigBuilder("test-app");
      ({ appId } = await importApp(config.config));
    });
    it("logIn", async () => {
      const { result } = renderAuth(appId, baseUrl);
      await testAuthOperation({
        authOperation: () => result.current.logIn({ email: "test@test.com", password: "password" }),
        expectedResult: () => expect(result.current.result.error).toBeDefined(),
      });
    });
    it("logInWithAnonymous", async () => {
      const { result } = renderAuth(appId, baseUrl);
      await testAuthOperation({
        authOperation: () => result.current.logInWithAnonymous(),
        expectedResult: () => expect(result.current.result.error).toBeDefined(),
      });
    });
    it("logInWithApiKey", async () => {
      const { result } = renderAuth(appId, baseUrl);
      await testAuthOperation({
        authOperation: () => result.current.logInWithApiKey("12345"),
        expectedResult: () => expect(result.current.result.error).toBeDefined(),
      });
    });
    it("logInWithEmailPassword", async () => {
      const { result } = renderAuth(appId, baseUrl);
      await testAuthOperation({
        authOperation: () => result.current.logInWithEmailPassword({ email: "test@test.com", password: "password" }),
        expectedResult: () => expect(result.current.result.error).toBeDefined(),
      });
    });
    it("logInWithJWT", async () => {
      const { result } = renderAuth(appId, baseUrl);
      await testAuthOperation({
        authOperation: () => result.current.logInWithJWT("token"),
        expectedResult: () => expect(result.current.result.error).toBeDefined(),
      });
    });
    it("logInWithGoogle", async () => {
      const { result } = renderAuth(appId, baseUrl);
      await testAuthOperation({
        authOperation: () => result.current.logInWithGoogle({ idToken: "1234" }),
        expectedResult: () => expect(result.current.result.error).toBeDefined(),
      });
    });
    it("logInWithApple", async () => {
      const { result } = renderAuth(appId, baseUrl);
      await testAuthOperation({
        authOperation: () => result.current.logInWithApple("token"),
        expectedResult: () => expect(result.current.result.error).toBeDefined(),
      });
    });
    it("logInWithFacebook", async () => {
      const { result } = renderAuth(appId, baseUrl);
      await testAuthOperation({
        authOperation: () => result.current.logInWithFacebook("token"),
        expectedResult: () => expect(result.current.result.error).toBeDefined(),
      });
    });
    it("logInWithFunction", async () => {
      const { result } = renderAuth(appId, baseUrl);
      await testAuthOperation({
        authOperation: () => result.current.logInWithFunction({ foo: "bar" }),
        expectedResult: () => expect(result.current.result.error).toBeDefined(),
      });
    });
    it("logOut", async () => {
      const { result } = renderAuth(appId, baseUrl);
      await testAuthOperation({
        authOperation: () => result.current.logOut(),
        expectedResult: () => expect(result.current.result.success).toBeTruthy(),
      });
    });
  });
});
