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

import { NetworkTransport, Request, FetchResponse, FetchHeaders } from "@realm/network-transport";

import { MongoDBRealmError } from "../..";

/**
 * Perform mocked requests and get pre-recorded responses
 */
export class MockNetworkTransport implements NetworkTransport {
  /**
   * List of all requests captured.
   */
  public readonly requests: Request<unknown>[] = [];

  /**
   * Responses sent back on each expected request.
   */
  public readonly responses: unknown[];

  /**
   * Construct a mocked network transport which returns pre-recorded requests.
   * @param responses An array of pre-recorded requests.
   */
  constructor(responses: unknown[] = []) {
    this.responses = responses;
  }

  /** @inheritdoc */
  fetch<RequestBody>(request: Request<RequestBody>): Promise<FetchResponse> {
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
    this.requests.push(request);
    if (this.responses.length > 0) {
      const [response] = this.responses.splice(0, 1);
      if (response instanceof MongoDBRealmError) {
        return Promise.resolve({
          ok: false,
          status: response.statusCode,
          statusText: response.statusText,
          url: response.url,
          json: async () => ({
            error: response.error,
            errorCode: response.errorCode,
            link: response.link,
          }),
          headers: {
            get(name: string) {
              if (name.toLowerCase() === "content-type") {
                return "application/json";
              }
            },
          } as FetchHeaders,
        } as FetchResponse);
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
          } as FetchHeaders,
        } as FetchResponse);
      }
    } else {
      throw new Error(
        `Unexpected request (method = ${request.method}, url = ${request.url}, body = ${JSON.stringify(request.body)})`,
      );
    }
  }

  /** @inheritdoc */
  fetchWithCallbacks(): void {
    throw new Error("Not implemented");
  }
}
