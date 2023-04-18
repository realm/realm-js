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

type ErrorResponse = {
  error: string;
};

export function isErrorResponse(response: unknown): response is ErrorResponse {
  if (typeof response === "object" && response !== null) {
    assertObject(response);
    return typeof response.error === "string";
  } else {
    return false;
  }
}

export type LoginResponse = {
  access_token: string;
  refresh_token: string;
};

export function assertLoginResponse(response: unknown): asserts response is LoginResponse {
  assertObject(response);
  if (typeof response.access_token !== "string" && typeof response.refresh_token !== "string") {
    throw new Error("Expected a LoginResponse");
  }
}

export type App = {
  _id: string;
  client_app_id: string;
  name: string;
  location: string;
  deployment_model: string;
  domain_id: string;
  group_id: string;
  last_used: number;
  last_modified: number;
  product: string;
  environment: string;
};

export type AppResponse = App;

export type AppsResponse = Array<App>;

export type ProfileResponse = {
  roles: Array<{ role_name: string; group_id: string }>;
};

export function assertObject(response: unknown): asserts response is Record<string, unknown> {
  if (typeof response !== "object" || response === null) {
    throw new Error("Expected an object");
  }
}

export function assertArray(response: unknown): asserts response is Array<unknown> {
  if (!Array.isArray(response)) {
    throw new Error("Expected an array");
  }
}

export function assertAppResponse(response: unknown): asserts response is AppResponse {
  assertObject(response);
  if (typeof response.client_app_id !== "string" || typeof response._id !== "string") {
    throw new Error("Expected an AppResponse");
  }
}

export function assertAppsResponse(response: unknown): asserts response is AppsResponse {
  assertArray(response);
  response.every(assertAppResponse);
}

export type DeploymentDraft = {
  _id: string;
  user_id: string;
  app: App;
};

export type DeploymentDraftResponse = DeploymentDraft;

export function assertDeploymentDraft(value: unknown): asserts value is DeploymentDraftResponse {
  assertObject(value);
  if (typeof value._id !== "string" || typeof value.user_id !== "string" || typeof value.app !== "object") {
    throw new Error("Expected a DeploymentDraftResponse");
  }
}

export function assertDeploymentDraftResponse(response: unknown): asserts response is DeploymentDraftResponse {
  assertDeploymentDraft(response);
}

export type DeploymentDraftsResponse = Array<DeploymentDraft>;

export function assertDeploymentsDraftResponse(response: unknown): asserts response is DeploymentDraftsResponse {
  assertArray(response);
  response.every(assertDeploymentDraft);
}

export type Deployment = {
  _id: string;
  name: string;
  app_id: string;
  draft_id?: string;
  user_id: string;
  deployed_at: number;
  origin: string;
  commit: string;
  status: string;
  status_error_message: string;
  diff_url: string;
  remote_location: string;
};

export type DeploymentResponse = Deployment;

function assertDeployment(value: unknown): asserts value is Deployment {
  assertObject(value);
  if (typeof value._id !== "string" || typeof value.deployed_at !== "number") {
    throw new Error("Expected a Deployment");
  }
}

export function assertDeploymentResponse(response: unknown): asserts response is DeploymentResponse {
  assertDeployment(response);
}

export type DeploymentsResponse = Array<Deployment>;

export function assertDeploymentsResponse(response: unknown): asserts response is DeploymentsResponse {
  assertArray(response);
  response.every(assertDeployment);
}

// TODO: Extend this
export type Service = {
  _id: string;
};

export type ServiceResponse = Service;

export function assertServiceResponse(response: unknown): asserts response is ServiceResponse {}

export function assertProfileResponse(response: unknown): asserts response is ProfileResponse {
  assertObject(response);
  if (!Array.isArray(response.roles) || !response.roles.every((item) => typeof item.role_name === "string")) {
    throw new Error("Expected a ProfileResponse");
  }
}

type AuthProvider = {
  _id: string;
  name: string;
  type: string;
  disabled: boolean;
};

type AuthProvidersResponse = Array<AuthProvider>;

export function assertAuthProvidersResponse(response: unknown): asserts response is AuthProvidersResponse {
  assertArray(response);
  if (
    !response.every((item) => {
      assertObject(item);
      return typeof item._id === "string" && typeof item.name === "string" && typeof item.type === "string";
    })
  ) {
    throw new Error("Expected a AuthProvidersResponse");
  }
}

type AtlasFunction = {
  _id: string;
  name: string;
  last_modified: number;
};

export function assertAtlasFunction(value: unknown): asserts value is AtlasFunction {
  assertObject(value);
  if (typeof value._id !== "string" || typeof value.name !== "string") {
    throw new Error("Expected a Function");
  }
}

export type FunctionResponse = Array<AtlasFunction>;

export function assertFunctionResponse(response: unknown): asserts response is FunctionResponse {
  assertAtlasFunction(response);
}

export type FunctionsResponse = Array<AtlasFunction>;
export function assertFunctionsResponse(response: unknown): asserts response is FunctionsResponse {
  assertArray(response);
  response.every(assertAtlasFunction);
}

export type Secret = {
  _id: string;
  name: string;
};

export function assertSecret(value: unknown): asserts value is Secret {
  assertObject(value);
}

export type SecretsResponse = Array<Secret>;
export function assertSecretsResponse(response: unknown): asserts response is SecretsResponse {
  assertArray(response);
  response.every(assertAtlasFunction);
}
