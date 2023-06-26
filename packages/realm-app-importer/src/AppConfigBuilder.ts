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

export type AppConfig = {
  name: string;
  baseFilePath?: string;
  sync?: SyncConfig;
  security?: {
    allowed_request_origins?: string[];
  };
  // Additional config below
  secrets: Record<string, string>;
  values: Record<string, string>;
  services: [ServiceConfig, ServiceRule[]][];
  authProviders: AuthProviderConfig[];
  functions: FunctionConfig[];
};

export type SyncConfig = {
  development_mode_enabled: boolean;
};

export type ServiceConfig = {
  name: string;
  type: string;
  config: DisabledConfig | PartitionSyncConfig | FlexibleSyncConfig;
  secret_config: Record<string, unknown>;
  version?: number;
};

export type ServiceRule = {
  roles: Array<{
    name: string;
    apply_when: unknown; // {}
    document_filters: {
      read: boolean;
      write: boolean;
    };
    write: boolean;
    read: boolean;
    insert: boolean;
    delete: boolean;
  }>;
};

export type AuthProviderConfig = {
  name: string;
  disabled: boolean;
} & (
  | {
      type: "anon-user" | "api-key";
    }
  | {
      type: "local-userpass";
      config: EmailPasswordAuthConfig;
    }
  | {
      type: "custom-function";
      config: CustomFunctionAuthConfig;
    }
  | {
      type: "custom-token";
      config: CustomTokenAuthConfig;
      secret_config: CustomTokenAuthSecretConfig;
      metadata_fields: Array<CustomTokenAuthMetadataField>;
    }
);

export type EmailPasswordAuthConfig = {
  autoConfirm?: boolean;
  confirmEmailSubject?: string;
  emailConfirmationUrl?: string;
  resetPasswordSubject?: string;
  resetPasswordUrl?: string;
  runConfirmationFunction?: boolean;
  runResetFunction?: boolean;
  confirmationFunctionName?: string;
  confirmationFunctionId?: string;
  resetFunctionName?: string;
  resetFunctionId?: string;
};

export type CustomFunctionAuthConfig = {
  authFunctionName: string;
  authFunctionId?: string;
};

export type CustomTokenAuthConfig = {
  audience: string; // ""
  signingAlgorithm: "HS256";
  useJWKURI: boolean;
};

export type CustomTokenAuthSecretConfig = {
  signingKeys: string[];
};

export type CustomTokenAuthMetadataField = {
  required: boolean;
  name: string;
  field_name: string;
};

export type FunctionConfig = {
  name: string;
  private: boolean;
  can_evaluate?: unknown; // {}
  run_as_system?: boolean;
  source: string;
};

export type DisabledConfig = Record<string, never>;

export type PartitionSyncConfig = {
  sync: {
    state: "enabled";
    database_name: string;
    partition: PartitionConfig;
  };
};

export type PartitionConfig = {
  key: string;
  type: "long" | "objectId" | "string" | "uuid";
  required?: boolean;
  permissions: {
    read: boolean;
    write: boolean;
  };
};

export type FlexibleSyncConfig = {
  flexible_sync: {
    state: "enabled";
    database_name: string;
  };
};

export class AppConfigBuilder {
  public readonly config: AppConfig;

  constructor(name = "unnamed") {
    this.config = {
      name,
      secrets: {},
      values: {},
      services: [],
      authProviders: [],
      functions: [],
    };
  }

  name(value: string) {
    this.config.name = value;
    return this;
  }

  sync(value: SyncConfig) {
    this.config.sync = value;
    return this;
  }

  secret(name: string, value: string) {
    this.config.secrets[name] = value;
    return this;
  }

  value(name: string, value: string) {
    this.config.values[name] = value;
    return this;
  }

  service(config: ServiceConfig, rules: ServiceRule[] = []) {
    this.config.services.push([config, rules]);
    return this;
  }

  authProvider(config: AuthProviderConfig) {
    this.config.authProviders.push(config);
    return this;
  }

  function(config: FunctionConfig) {
    this.config.functions.push(config);
    return this;
  }
}
