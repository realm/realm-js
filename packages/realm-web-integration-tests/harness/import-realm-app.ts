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

import path from "path";

import { AppImporter } from "@realm/app-importer";

const MDB_REALM_BASE_URL = process.env.MDB_REALM_BASE_URL || "http://localhost:9090";
const MDB_REALM_USERNAME = process.env.MDB_REALM_USERNAME || "unique_user@domain.com";
const MDB_REALM_PASSWORD = process.env.MDB_REALM_PASSWORD || "password";

const MDB_REALM_APP_ID = process.env.MDB_REALM_APP_ID;

export async function importRealmApp() {
  // Create a new MongoDBRealmService
  const baseUrl = MDB_REALM_BASE_URL;
  if (MDB_REALM_APP_ID) {
    console.log(`Skipping import of the app (MDB_REALM_APP_ID = ${MDB_REALM_APP_ID})`);
    return { appId: MDB_REALM_APP_ID, baseUrl };
  } else {
    const importer = new AppImporter({
      baseUrl,
      credentials: {
        kind: "username-password",
        username: MDB_REALM_USERNAME,
        password: MDB_REALM_PASSWORD,
      },
    });
    const { appId } = await importer.importApp({
      name: "my-test-app",
      security: {
        allowed_request_origins: ["http://localhost:8080"],
      },
      secrets: {
        "jwt-secret": "2k66QfKeTRk3MdZ5vpDYgZCu2k66QfKeTRk3MdZ5vpDYgZCu",
        "local-mongodb-uri": "mongodb://localhost:26000",
      },
      values: {},
      authProviders: [
        {
          name: "anon-user",
          type: "anon-user",
          disabled: false,
        },
        {
          name: "api-key",
          type: "api-key",
          disabled: false,
        },
        {
          name: "custom-function",
          type: "custom-function",
          config: {
            authFunctionName: "customAuthentication",
          },
          disabled: false,
        },
        {
          name: "custom-token",
          type: "custom-token",
          config: {
            audience: "",
            signingAlgorithm: "HS256",
            useJWKURI: false,
          },
          secret_config: {
            signingKeys: ["jwt-secret"],
          },
          disabled: false,
          metadata_fields: [
            {
              required: true,
              name: "mySecretField",
              field_name: "secret",
            },
          ],
        },
        {
          name: "local-userpass",
          type: "local-userpass",
          config: {
            autoConfirm: true,
            resetFunctionName: "resetPassword",
            runConfirmationFunction: false,
            runResetFunction: true,
          },
          disabled: false,
        },
      ],
      functions: [
        {
          name: "customAuthentication",
          private: true,
          run_as_system: true,
          source: `
            exports = async function (loginPayload) {
              // Get a handle for the app.users collection
              const users = context.services.get("local-mongodb").db("app").collection("users");

              // Parse out custom data from the FunctionCredential

              const { username, secret } = loginPayload;

              if (secret !== "v3ry-s3cret") {
                throw new Error("Ah ah ah, you didn't say the magic word");
              }
              // Query for an existing user document with the specified username

              const user = await users.findOne({ username });

              if (user) {
                // If the user document exists, return its unique ID
                return user._id.toString();
              } else {
                // If the user document does not exist, create it and then return its unique ID
                const result = await users.insertOne({ username });
                return result.insertedId.toString();
              }
            };
          `,
        },
        {
          name: "resetPassword",
          private: false,
          can_evaluate: {},
          source: `
            exports = () => {
              // will not reset the password
              return { status: "fail" };
            };
          `,
        },
        {
          name: "translate",
          private: false,
          source: `
            exports = function (sentence, languages) {
              if (languages === "fr_en") {
                if (sentence === "bonjour") {
                  return "hello";
                } else {
                  return "what?";
                }
              } else if (languages === "en_fr") {
                if (sentence === "hello") {
                  return "bonjour";
                } else {
                  return "que?";
                }
              } else {
                throw new Error("Watch your language!");
              }
            };
          `,
        },
      ],
      services: [
        [
          {
            name: "local-mongodb",
            type: "mongodb",
            config: {},
            secret_config: {
              uri: "local-mongodb-uri",
            },
          },
          [
            {
              roles: [
                {
                  name: "defaultRole",
                  apply_when: {},
                  document_filters: {
                    read: true,
                    write: true,
                  },
                  write: true,
                  read: true,
                  insert: true,
                  delete: true,
                },
              ],
            },
          ],
        ],
      ],
    });
    return { appId, baseUrl };
  }
}
