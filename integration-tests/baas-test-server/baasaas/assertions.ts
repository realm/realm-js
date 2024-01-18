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

type StartedContainer = {
  id: string;
};

export function assertStartedContainer(value: unknown): asserts value is StartedContainer {
  assert(typeof value === "object" && value !== null);
  assert("id" in value, "Missing an id");
  assert.equal(typeof value.id, "string");
}

type StopContainerResponse = Record<never, never>;

export function assertStopContainerResponse(value: unknown): asserts value is StopContainerResponse {
  /* nothing to assert - for now */
}

type Container = {
  id: string;
  lastStatus: "RUNNING" | "PENDING" | string;
  startedAt?: string;
  createdAt: string;
  creatorId: string;
  creatorName: string;
  httpUrl?: string;
  mongoUrl?: string;
  tags: unknown[];
};

export function assertContainer(value: unknown): asserts value is Container {
  assert(typeof value === "object" && value !== null);
  assert("id" in value && typeof value.id === "string");
  assert("lastStatus" in value && typeof value.lastStatus === "string");
  assert("createdAt" in value && typeof value.createdAt === "string");
  assert("creatorId" in value && typeof value.creatorId === "string");
  assert("creatorName" in value && typeof value.creatorName === "string");
  if ("startedAt" in value && typeof value.startedAt !== "string") {
    // The service will sometimes respond with an empty object in `startedAt`
    delete value.startedAt;
  }
  if ("httpUrl" in value) {
    assert(typeof value.httpUrl === "string");
  }
  if ("mongoUrl" in value) {
    assert(typeof value.mongoUrl === "string");
  }
  assert("tags" in value && Array.isArray(value.tags));
}

type Userinfo = {
  id: string;
  type: string;
  custom_data: Record<string, unknown>;
  data: Record<string, unknown>;
  identities: [{ id: string; provider_type: string }];
};

export function assertUserinfo(value: unknown): asserts value is Userinfo {
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

type Image = {
  _id: string;
  project: string;
  order: number;
  versionId: string;
  buildVariant: string;
  taskId: string;
  revision: string;
  execution: number;
  timestamp: string;
  branch: string;
  imageTag: string;
};

export function assertImage(value: unknown): asserts value is Image {
  assert(typeof value === "object" && value !== null);
  assert("_id" in value && typeof value._id === "string");
  assert("project" in value && typeof value.project === "string");
  assert("order" in value && typeof value.order === "number");
  assert("versionId" in value && typeof value.versionId === "string");
  assert("buildVariant" in value && typeof value.buildVariant === "string");
  assert("taskId" in value && typeof value.taskId === "string");
  assert("revision" in value && typeof value.revision === "string");
  assert("execution" in value && typeof value.execution === "number");
  assert("timestamp" in value && typeof value.timestamp === "string");
  assert("branch" in value && typeof value.branch === "string");
  assert("imageTag" in value && typeof value.imageTag === "string");
}

type Images = {
  allBranches: string[];
  images: Record<string, undefined | Image[]>;
};

export function assertImages(value: unknown): asserts value is Images {
  assert(typeof value === "object" && value !== null);
  assert("allBranches" in value && Array.isArray(value.allBranches));
  for (const branch of value.allBranches) {
    assert.equal(typeof branch, "string");
  }
  assert("images" in value && typeof value.images === "object" && value.images !== null);
  for (const available of Object.values(value.images)) {
    assert(Array.isArray(available));
    for (const image of available) {
      assertImage(image);
    }
  }
}

type ContainerList = Container[];

export function assertContainerList(value: unknown): asserts value is ContainerList {
  assert(Array.isArray(value));
  for (const element of value) {
    assertContainer(element);
  }
}
