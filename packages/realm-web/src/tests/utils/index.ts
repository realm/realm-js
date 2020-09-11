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

/**
 * The headers added by the Fetcher when fetching JSON.
 */
export const ACCEPT_JSON_HEADERS = Object.freeze({
    Accept: "application/json",
});

/**
 * The headers added by the Fetcher when fetching JSON while sending a JSON body.
 */
export const SENDING_JSON_HEADERS = Object.freeze({
    ...ACCEPT_JSON_HEADERS,
    "Content-Type": "application/json",
});

/**
 * A typical location request.
 */
export const LOCATION_REQUEST = Object.freeze({
    method: "GET",
    url: "http://localhost:1234/api/client/v2.0/app/my-mocked-app/location",
    headers: ACCEPT_JSON_HEADERS,
});

/**
 * A typical location response.
 */
export const LOCATION_RESPONSE = Object.freeze({
    hostname: "http://localhost:1337",
    location: "US-VA",
    deployment_model: "GLOBAL", // eslint-disable-line @typescript-eslint/camelcase
});

/**
 * Default information about the device.
 */
export const DEFAULT_DEVICE_INFORMATION =
    "eyJzZGtWZXJzaW9uIjoiMC4wLjAtdGVzdCIsInBsYXRmb3JtIjoibm9kZSIsInBsYXRmb3JtVmVyc2lvbiI6IjEyLjE0LjEifQ";

export * from "./MockApp";
export * from "./MockFetcher";
export * from "./MockNetworkTransport";
