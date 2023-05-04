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

import { expect } from "chai";

import { AppConfigBuilder, ServiceConfig, ServiceRule, AuthProviderConfig, FunctionConfig } from "@realm/app-importer";

describe("AppConfigBuilder", () => {
  it("provides a default name", () => {
    const builder = new AppConfigBuilder();
    expect(builder.config.name).equals("unnamed");
  });

  it("sets name through constructor", () => {
    const builder = new AppConfigBuilder("my-app");
    expect(builder.config.name).equals("my-app");
  });

  it("sets secrets", () => {
    const builder = new AppConfigBuilder();
    builder.secret("my-secret", "v3ry-s3cr3t").secret("my-other-secret", "a1s0-s3cr3t");
    expect(builder.config.secrets).deep.equals({ "my-secret": "v3ry-s3cr3t", "my-other-secret": "a1s0-s3cr3t" });
  });

  it("sets values", () => {
    const builder = new AppConfigBuilder();
    builder.value("my-value", "plaintext").value("my-other-value", "hi");
    expect(builder.config.values).deep.equals({ "my-value": "plaintext", "my-other-value": "hi" });
  });

  it("sets service", () => {
    const builder = new AppConfigBuilder();
    const config: ServiceConfig = {
      name: "mongodb",
      type: "mongodb",
      config: {
        sync: {
          state: "enabled",
          database_name: "my-database",
          partition: {
            key: "id",
            type: "long",
            permissions: {
              read: true,
              write: true,
            },
          },
        },
      },
      secret_config: {
        uri: "mongodb_uri",
      },
      version: 1,
    };
    const rule: ServiceRule = {
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
    };
    builder.service(config, [rule]);
    expect(builder.config.services).deep.equals([[config, [rule]]]);
  });

  it("sets auth provider", () => {
    const builder = new AppConfigBuilder();
    const config: AuthProviderConfig = {
      name: "anon-user",
      type: "anon-user",
      disabled: false,
    };
    builder.authProvider(config);
    expect(builder.config.authProviders).deep.equals([config]);
  });

  it("sets local-userpass provider", () => {
    const builder = new AppConfigBuilder();
    const config: AuthProviderConfig = {
      name: "local-userpass",
      type: "local-userpass",
      disabled: false,
      config: {
        autoConfirm: false,
        confirmEmailSubject: "",
        confirmationFunctionName: "confirmFunc",
        emailConfirmationUrl: "http://localhost/confirmEmail",
        resetFunctionName: "resetFunc",
        resetPasswordSubject: "",
        resetPasswordUrl: "http://localhost/resetPassword",
        runConfirmationFunction: true,
        runResetFunction: true,
      },
    };
    builder.authProvider(config);
    expect(builder.config.authProviders).deep.equals([config]);
  });

  it("sets function", () => {
    const builder = new AppConfigBuilder();
    const config: FunctionConfig = {
      name: "sum",
      can_evaluate: {},
      private: true,
      run_as_system: false,
      source: `
        exports = function (...args) {
          return parseInt(args.reduce((a, b) => a + b, 0));
        }
      `,
    };
    builder.function(config);
    expect(builder.config.functions).deep.equals([config]);
  });
});
