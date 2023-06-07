////////////////////////////////////////////////////////////////////////////
//
// Copyright 2020 Realm Inc.
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

import { AppConfig, AppImporter, Credentials } from "@realm/app-importer";
import { act, waitFor } from "@testing-library/react-native";
import { useAuth } from "../useAuth";
import { useEmailPasswordAuth } from "../useEmailPasswordAuth";

export async function testAuthOperation({
  authOperation,
  result,
  expectedResult,
}: {
  authOperation: () => Promise<any>;
  result: { current: ReturnType<typeof useEmailPasswordAuth> | ReturnType<typeof useAuth> };
  expectedResult: () => void;
}) {
  await act(async () => {
    authOperation();
    await waitFor(() => {
      expect(result.current.result.pending).toEqual(true);
    });
  });
  await waitFor(() => {
    expectedResult();
  });
}

const { realmBaseUrl = "http://localhost:9090" } = process.env;

export const baseUrl = realmBaseUrl;

function getCredentials(): Credentials {
  const { publicKey, privateKey, username = "unique_user@domain.com", password = "password" } = process.env;
  if (typeof publicKey === "string" && typeof privateKey === "string") {
    return {
      kind: "api-key",
      publicKey,
      privateKey,
    };
  } else {
    return {
      kind: "username-password",
      username,
      password,
    };
  }
}

const credentials = getCredentials();

const importer = new AppImporter({
  baseUrl: realmBaseUrl,
  credentials,
});

export async function importApp(config: AppConfig): Promise<{ appId: string }> {
  const { appId } = await importer.importApp(config);
  return { appId };
}
