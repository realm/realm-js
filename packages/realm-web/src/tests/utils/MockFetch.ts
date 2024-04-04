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

import { fetch, RequestInit } from "@realm/fetch";

type RequestWithUrl = {
  url: string;
  body?: unknown;
} & Omit<RequestInit, "body">;

import { MongoDBRealmError } from "../..";

export type MockFetch = typeof fetch<any> & {
  requests: RequestWithUrl[];
};

/**
 * Perform mocked requests and get pre-recorded responses
 * @param responses A list of pre-recorded responses
 * @returns A mock for fetch
 */
export function createMockFetch(responses: unknown[]): MockFetch {
  const mock: MockFetch = (url: string, request: RequestInit = {}) => {
    if (!request.headers || Object.keys(request.headers).length === 0) {
      delete request.headers;
    }
    // Save a parsed body, instead of a string
    if (typeof request.body === "string") {
      request.body = JSON.parse(request.body);
    }
    // Delete the body if it's missing a value, which makes it easier to expect.deepEquals.
    if (request.body === undefined) {
      delete request.body;
    }
    mock.requests.push({ ...request, url });
    if (responses.length > 0) {
      const [response] = responses.splice(0, 1);
      if (response instanceof MongoDBRealmError) {
        return Promise.resolve({
          ok: false,
          status: response.statusCode,
          statusText: response.statusText,
          url: response.url,
          json: async () => ({
            error: response.error,
            error_code: response.errorCode,
            link: response.link,
          }),
          headers: {
            get(name: string) {
              if (name.toLowerCase() === "content-type") {
                return "application/json";
              }
            },
          },
        } as Response);
      } else {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(response),
          headers: {
            get(name: string) {
              if (name.toLowerCase() === "content-type") {
                return "application/json";
              }
            },
          },
        } as Response);
      }
    } else {
      throw new Error(
        `Unexpected request (method = ${request.method}, url = ${url}, body = ${JSON.stringify(request.body)})`,
      );
    }
  };
  mock.requests = [];

  return mock;
}
