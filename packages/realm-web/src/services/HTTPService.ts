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

import { Fetcher } from "../Fetcher";
import { FunctionsFactory } from "../FunctionsFactory";

type HTTP = Realm.Services.HTTP;
type RequestOptions = Realm.Services.HTTP.RequestOptions;
type Response = Realm.Services.HTTP.Response;

// @see https://github.com/mongodb/stitch-js-sdk/blob/master/packages/core/services/http/src/internal/CoreHttpServiceClient.ts

/**
 * The Stitch HTTP Service is a generic interface that enables you to communicate with any service that is available over HTTP.
 * @see https://docs.mongodb.com/stitch/services/http/
 */
export class HTTPService implements HTTP {
  /**
   * The functions factory interface to use when sending requests.
   */
  private readonly functions: Realm.DefaultFunctionsFactory;

  /**
   * Construct an HTTP Service.
   * @param fetcher The underlying fetcher.
   * @param serviceName An optional service name.
   */
  constructor(fetcher: Fetcher, serviceName = "http") {
    this.functions = FunctionsFactory.create(fetcher, { serviceName });
  }

  /**
   * Sends an HTTP GET request to the specified URL.
   * @param url The URL to send the request to.
   * @param options Options related to the request.
   * @returns The response.
   */
  get(url: string, options: RequestOptions = {}): Promise<Response> {
    return this.functions.get({ url, ...options });
  }

  /**
   * Sends an HTTP POST request to the specified URL.
   * @param url The URL to send the request to.
   * @param options Options related to the request.
   * @returns The response.
   */
  post(url: string, options: RequestOptions = {}): Promise<Response> {
    return this.functions.post({ url, ...options });
  }

  /**
   * Sends an HTTP PUT request to the specified URL.
   * @param url The URL to send the request to.
   * @param options Options related to the request.
   * @returns The response.
   */
  put(url: string, options: RequestOptions = {}): Promise<Response> {
    return this.functions.put({ url, ...options });
  }

  /**
   * Sends an HTTP DELETE request to the specified URL.
   * @param url The URL to send the request to.
   * @param options Options related to the request.
   * @returns The response.
   */
  delete(url: string, options: RequestOptions = {}): Promise<Response> {
    return this.functions.delete({ url, ...options });
  }

  /**
   * Sends an HTTP HEAD request to the specified URL.
   * @param url The URL to send the request to.
   * @param options Options related to the request.
   * @returns The response.
   */
  head(url: string, options: RequestOptions = {}): Promise<Response> {
    return this.functions.head({ url, ...options });
  }

  /**
   * Sends an HTTP PATCH request to the specified URL.
   * @param url The URL to send the request to.
   * @param options Options related to the request.
   * @returns The response.
   */
  patch(url: string, options: RequestOptions = {}): Promise<Response> {
    return this.functions.patch({ url, ...options });
  }
}

/**
 * Creates an HTTP Service.
 * Note: This method exists to enable function binding.
 * @param fetcher The underlying fetcher.
 * @param serviceName An optional service name.
 * @returns The new HTTP Service.
 */
export function createService(fetcher: Fetcher, serviceName = "http"): HTTPService {
  return new HTTPService(fetcher, serviceName);
}
