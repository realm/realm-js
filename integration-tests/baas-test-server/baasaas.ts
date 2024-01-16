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

const BAASAAS_BASE_URL = "https://us-east-1.aws.data.mongodb-api.com/app/baas-container-service-autzb";

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

type ImagesResponse = {
  allBranches: string[];
  images: Record<string, undefined | Image[]>;
};

function assertImagesResponse(value: unknown): asserts value is ImagesResponse {
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

export async function listImages(): Promise<ImagesResponse> {
  const response = await fetch(`${BAASAAS_BASE_URL}/endpoint/images`);
  assert(response.ok);
  const json = await response.json();
  assertImagesResponse(json);
  return json;
}

export type BaaSaaSCommandArgv = {
  branch: string;
};

export async function runBaaSaaS(argv: BaaSaaSCommandArgv) {
  const { BAASAAS_KEY } = process.env;
  assert(BAASAAS_KEY, "Missing BAASAAS_KEY env");
}
