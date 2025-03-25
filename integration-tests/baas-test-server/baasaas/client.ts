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

import {
  assertContainer,
  assertContainerList,
  assertImages,
  assertStartedContainer,
  assertStopContainerResponse,
  assertUserinfo,
} from "./assertions";
import { request } from "./request";

const BAASAAS_BASE_URL = "https://us-east-1.aws.data.mongodb-api.com/app/baas-container-service-autzb/endpoint/";

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
    url.searchParams.append("githash", options.githash);
  } else if ("branch" in options) {
    url.searchParams.append("branch", options.branch);
  }
  return request({ url, method: "POST", authenticated: true }, assertStartedContainer);
}

export async function stopContainer(id: string) {
  const url = new URL("stopContainer", BAASAAS_BASE_URL);
  url.searchParams.append("id", id);
  return request({ url, method: "POST", authenticated: true }, assertStopContainerResponse);
}

export async function containerStatus(id: string) {
  const url = new URL("containerStatus", BAASAAS_BASE_URL);
  url.searchParams.append("id", id);
  return request({ url, method: "GET", authenticated: true }, assertContainer);
}

export async function userinfo() {
  const url = new URL("userinfo", BAASAAS_BASE_URL);
  return request({ url, method: "GET", authenticated: true }, assertUserinfo);
}

export async function listImages() {
  const url = new URL("images", BAASAAS_BASE_URL);
  return request({ url, method: "GET", authenticated: false }, assertImages);
}

export async function listContainers(mine = false) {
  const url = new URL("listContainers", BAASAAS_BASE_URL);
  if (mine) {
    url.searchParams.append("mine", "true");
  }
  return request({ url, method: "GET", authenticated: true }, assertContainerList);
}
