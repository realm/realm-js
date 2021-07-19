////////////////////////////////////////////////////////////////////////////
//
// Copyright 2021 Realm Inc.
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

module.exports = [
  {
    name: "RealmFile",
    primaryKey: "path",
    properties: {
      path: "string",
      user: "User",
    },
  },
  {
    name: "User",
    primaryKey: "id",
    properties: {
      id: "string",
      accounts: { type: "list", objectType: "Account" },
      isAdmin: "bool",
    },
  },
  {
    name: "Account",
    properties: {
      provider: "string",
      provider_id: "string",
      data: { type: "string", optional: true },
      tokens: { type: "list", objectType: "Token" },
      user: "User",
    },
  },
  {
    name: "Token",
    primaryKey: "token",
    properties: {
      token: "string",
      expires: "date",
      revoked: { type: "date", optional: true },
      files: { type: "list", objectType: "RealmFile" },
      account: "Account",
      app_id: "string",
    },
  },
];
