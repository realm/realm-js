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

import { AppConfig, AppImporter, Credentials } from "@realm/app-importer";
import { act, waitFor } from "@testing-library/react-native";

const {
  PUBLIC_KEY: publicKey,
  PRIVATE_KEY: privateKey,
  USERNAME: username = "unique_user@domain.com",
  PASSWORD: password = "password",
  REALM_BASE_URL: realmBaseUrl = "http://localhost:9090",
} = process.env;

export async function testAuthOperation({
  authOperation,
  expectedResult,
}: {
  authOperation: () => void;
  expectedResult: () => void;
}) {
  await act(async () => {
    authOperation();
  });
  await waitFor(() => {
    expectedResult();
  });
}

export const baseUrl = realmBaseUrl;

function getCredentials(): Credentials {
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

const importer = new AppImporter({
  baseUrl,
  credentials: getCredentials(),
});

export async function importApp(config: AppConfig): Promise<{ appId: string }> {
  return importer.importApp(config);
}
