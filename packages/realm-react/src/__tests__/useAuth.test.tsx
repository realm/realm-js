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

import { AppConfigBuilder, AppImporter, Credentials } from "@realm/app-importer";
import { ImportedApp } from "@realm/app-importer/src/AppImporter";
import { useAuth } from "../useAuth";

const credentials: Credentials = {
  kind: "username-password",
  username: "unique_user@domain.com",
  password: "password",
};

const baseUrl = "http://localhost:9090";
const appImporter = new AppImporter({ baseUrl, credentials });

function renderAuth(importedApp: ImportedApp) {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AppProvider id={importedApp.appId} baseUrl={baseUrl}>
      {children}
    </AppProvider>
  );
  return renderHook(() => useAuth(), { wrapper });
}

// These will all fail since we haven't configured any of the authentication protocols
// The tests for the authentication methods themselves should be written elsewhere
describe("useAuth", () => {
  describe("all methods are callable and report a state", () => {
    let importedApp: ImportedApp;
    beforeAll(async () => {
      const config = new AppConfigBuilder("test-app");
      importedApp = await appImporter.importApp(config.config);
    });
    it("logIn", async () => {
      const { result } = renderAuth(importedApp);
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
    it("logInWithAnonymous", async () => {
      const { result } = renderAuth(importedApp);
      await act(async () => {
        result.current.logInWithAnonymous();
        await waitFor(() => {
          expect(result.current.result.pending).toBeTruthy();
        });
      });
      await waitFor(() => {
        expect(result.current.result.error).toBeDefined();
      });
    });
    it("logInWithApiKey", async () => {
      const { result } = renderAuth(importedApp);
      await act(async () => {
        result.current.logInWithApiKey("12345");
        await waitFor(() => {
          expect(result.current.result.pending).toBeTruthy();
        });
      });
      await waitFor(() => {
        expect(result.current.result.error).toBeDefined();
      });
    });
    it("logInWithEmailPassword", async () => {
      const { result } = renderAuth(importedApp);
      await act(async () => {
        result.current.logInWithEmailPassword({ email: "test@test.com", password: "password" });
        await waitFor(() => {
          expect(result.current.result.pending).toBeTruthy();
        });
      });
      await waitFor(() => {
        expect(result.current.result.error).toBeDefined();
      });
    });
    it("logInWithJWT", async () => {
      const { result } = renderAuth(importedApp);
      await act(async () => {
        result.current.logInWithJWT("token");
        await waitFor(() => {
          expect(result.current.result.pending).toBeTruthy();
        });
      });
      await waitFor(() => {
        expect(result.current.result.error).toBeDefined();
      });
    });
    it("logInWithGoogle", async () => {
      const { result } = renderAuth(importedApp);
      await act(async () => {
        result.current.logInWithGoogle({ idToken: "1234" });
        await waitFor(() => {
          expect(result.current.result.pending).toBeTruthy();
        });
      });
      await waitFor(() => {
        expect(result.current.result.error).toBeDefined();
      });
    });
    it("logInWithApple", async () => {
      const { result } = renderAuth(importedApp);
      await act(async () => {
        result.current.logInWithApple("token");
        await waitFor(() => {
          expect(result.current.result.pending).toBeTruthy();
        });
      });
      await waitFor(() => {
        expect(result.current.result.error).toBeDefined();
      });
    });
    it("logInWithFacebook", async () => {
      const { result } = renderAuth(importedApp);
      await act(async () => {
        result.current.logInWithFacebook("token");
        await waitFor(() => {
          expect(result.current.result.pending).toBeTruthy();
        });
      });
      await waitFor(() => {
        expect(result.current.result.error).toBeDefined();
      });
    });
    it("logInWithFunction", async () => {
      const { result } = renderAuth(importedApp);
      await act(async () => {
        result.current.logInWithFunction({ foo: "bar" });
        await waitFor(() => {
          expect(result.current.result.pending).toBeTruthy();
        });
      });
      await waitFor(() => {
        expect(result.current.result.error).toBeDefined();
      });
    });
    it("logOut", async () => {
      const { result } = renderAuth(importedApp);
      await act(async () => {
        result.current.logOut();
        await waitFor(() => {
          expect(result.current.result.pending).toBeTruthy();
        });
      });
      await waitFor(() => {
        expect(result.current.result.success).toBeTruthy();
      });
    });
  });
});
