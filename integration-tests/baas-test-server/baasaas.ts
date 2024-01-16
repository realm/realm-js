////////////////////////////////////////////////////////////////////////////
//
// Copyright 2024 Realm Inc.
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

import assert from "node:assert";
import gha from "@actions/core";

const BAASAAS_BASE_URL = "https://us-east-1.aws.data.mongodb-api.com/app/baas-container-service-autzb/endpoint/";

function createHeaders(appendKey = false) {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (appendKey) {
    const { BAASAAS_KEY = gha.getInput("baasaas-key") } = process.env;
    console.log(process.env);
    assert(BAASAAS_KEY, "Missing BAASAAS_KEY env");
    headers["apiKey"] = BAASAAS_KEY;
  }
  return headers;
}

type StartedContainer = {
  id: string;
};

function assertStartedContainer(value: unknown): asserts value is StartedContainer {
  assert(typeof value === "object" && value !== null);
  assert("id" in value && typeof value.id === "string");
}

type StartContainerOptions =
  | {
      githash: string;
    }
  | {
      branch: string;
    };

export async function startContainer(options: StartContainerOptions) {
  const url = new URL("startContainer", BAASAAS_BASE_URL);
  if ("githash" in options) {
    url.searchParams.append("branch", options.githash);
  } else if ("branch" in options) {
    url.searchParams.append("branch", options.branch);
  }
  const response = await fetch(url, { method: "POST", headers: createHeaders(true) });
  assert(response.ok);
  const json = await response.json();
  assertStartedContainer(json);
  return json;
}

type StopContainerResponse = {
  /* TODO: Fill in */
};

function assertStopContainerResponse(value: unknown): asserts value is StopContainerResponse {
  /* TODO: Fill in */
}

export async function stopContainer(id: string) {
  const url = new URL("stopContainer", BAASAAS_BASE_URL);
  url.searchParams.append("id", id);
  const response = await fetch(url, { method: "POST", headers: createHeaders(true) });
  assert(response.ok);
  const json = await response.json();
  assertStopContainerResponse(json);
}

type ContainerStatus = {
  id: string;
  lastStatus: "RUNNING" | "PENDING" | string;
  startedAt: string | Record<never, never>;
  createdAt: string;
  creatorId: string;
  creatorName: string;
  httpUrl?: string;
  mongoUrl?: string;
  tags: unknown[];
};

function assertContainerStatus(value: unknown): asserts value is ContainerStatus {
  assert(typeof value === "object" && value !== null);
  assert("id" in value && typeof value.id === "string");
  assert("lastStatus" in value && typeof value.lastStatus === "string");
  assert("startedAt" in value && (typeof value.startedAt === "string" || typeof value.startedAt === "object"));
  assert("createdAt" in value && typeof value.createdAt === "string");
  assert("creatorId" in value && typeof value.creatorId === "string");
  assert("creatorName" in value && typeof value.creatorName === "string");
  if ("httpUrl" in value) {
    assert(typeof value.httpUrl === "string");
  }
  if ("mongoUrl" in value) {
    assert(typeof value.mongoUrl === "string");
  }
  assert("tags" in value && Array.isArray(value.tags));
}

export async function containerStatus(id: string) {
  const url = new URL("containerStatus", BAASAAS_BASE_URL);
  url.searchParams.append("id", id);
  const response = await fetch(url, { headers: createHeaders(true) });
  assert(response.ok);
  const json = await response.json();
  assertContainerStatus(json);
  return json;
}

type Userinfo = {
  id: string;
  type: string;
  custom_data: Record<string, unknown>;
  data: Record<string, unknown>;
  identities: [{ id: string; provider_type: string }];
};

function assertUserinfo(value: unknown): asserts value is Userinfo {
  assert(typeof value === "object" && value !== null);
  assert("id" in value && typeof value.id === "string");
  assert("type" in value && typeof value.type === "string");
  assert("custom_data" in value && typeof value.custom_data === "object");
  assert("data" in value && typeof value.data === "object");
  assert("identities" in value && Array.isArray(value.identities));
  for (const identity of value.identities) {
    assert(typeof identity === "object");
    assert("id" in identity && typeof identity.id === "string");
    assert("provider_type" in identity && typeof identity.provider_type === "string");
  }
}

export async function userinfo() {
  const url = new URL("userinfo", BAASAAS_BASE_URL);
  const headers = createHeaders(true);
  const response = await fetch(url, { headers });
  assert(response.ok);
  const json = await response.json();
  assertUserinfo(json);
  return json;
}

type Image = {
  buildVariant: string;
  imageTag: string;
  /*
  _id: string;
  project: string;
  order: number;
  versionId: string;
  taskId: string;
  execution: number;
  timestamp: string;
  branch: string;
  revision: string;
  */
};

function assertImage(value: unknown): asserts value is Image {
  assert(typeof value === "object" && value !== null);
  const object = value as Record<string, unknown>;
  assert(typeof object.buildVariant === "string");
  assert(typeof object.imageTag === "string");
}

type Images = {
  allBranches: string[];
  images: Record<string, undefined | Image[]>;
};

function assertImages(value: unknown): asserts value is Images {
  assert(typeof value === "object" && value !== null);
  const object = value as Record<string, unknown>;
  assert(Array.isArray(object.allBranches));
  const { images } = object;
  assert(typeof images === "object" && images !== null);
  for (const available of Object.values(images)) {
    assert(Array.isArray(available));
    for (const image of available) {
      assertImage(image);
    }
  }
}

export async function listImages() {
  const url = new URL("images", BAASAAS_BASE_URL);
  const response = await fetch(url, { headers: createHeaders(false) });
  assert(response.ok);
  const json = await response.json();
  assertImages(json);
  return json;
}

type ListContainers = ContainerStatus[];

function assertListContainers(value: unknown): asserts value is ListContainers {
  assert(Array.isArray(value));
  for (const element of value) {
    assertContainerStatus(element);
  }
}

export async function listContainers(mine = false) {
  const url = new URL("listContainers", BAASAAS_BASE_URL);
  if (mine) {
    url.searchParams.append("mine", "true");
  }
  const response = await fetch(url, { headers: createHeaders(true) });
  assert(response.ok, response.statusText);
  const json = await response.json();
  assertListContainers(json);
  return json;
}
