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

import { Base64 } from "js-base64";

import { Fetcher } from "./Fetcher";
import { serialize } from "./utils/ejson";
import { encodeQueryString } from "./utils/string";

/**
 * A list of names that functions cannot have to be callable through the functions proxy.
 */
const RESERVED_NAMES = [
  "inspect",
  "callFunction",
  "callFunctionStreaming",
  // Methods defined on the Object.prototype might be "typeof probed" and called by libraries and runtime environments.
  ...Object.getOwnPropertyNames(Object.prototype),
];

type SimpleObject = Record<string, unknown>;

/**
 * The body of the request sent to call a remote function.
 */
interface CallFunctionBody {
  /**
   * Name of the function.
   */
  name: string;
  /**
   * An array of arguments to pass to the function.
   */
  arguments: unknown[];
  /**
   * An optional name of the service in which the function is defined.
   */
  service?: string;
}

/**
 * Pass an object implementing this interface when constructing a functions factory.
 */
export interface FunctionsFactoryConfiguration {
  /**
   * An optional name of the service in which functions are defined.
   */
  serviceName?: string;
  /**
   * Call this function to transform the arguments before they're sent to the service.
   */
  argsTransformation?: (args: unknown[]) => unknown[];
}

/**
 * Remove the key for any fields with undefined values.
 * @param args The arguments to clean.
 * @returns The cleaned arguments.
 */
export function cleanArgs(args: unknown[]): typeof args {
  for (const arg of args) {
    if (typeof arg === "object" && arg) {
      for (const [key, value] of Object.entries(arg)) {
        if (value === undefined) {
          delete (arg as SimpleObject)[key];
        }
      }
    }
  }
  return args;
}

/**
 * Remove keys for any undefined values and serialize to EJSON.
 * @param args The arguments to clean and serialize.
 * @returns The cleaned and serialized arguments.
 */
function cleanArgsAndSerialize(args: unknown[]) {
  const cleaned = cleanArgs(args);
  return cleaned.map((arg) => (typeof arg === "object" ? serialize(arg as SimpleObject) : arg));
}

/**
 * Defines how functions are called.
 */
export class FunctionsFactory {
  /**
   * Create a factory of functions, wrapped in a Proxy that returns bound copies of `callFunction` on any property.
   * @param fetcher The underlying fetcher to use when requesting.
   * @param config Additional configuration parameters.
   * @returns The newly created factory of functions.
   */
  public static create<FunctionsFactoryType extends SimpleObject = Realm.DefaultFunctionsFactory>(
    fetcher: Fetcher,
    config: FunctionsFactoryConfiguration = {},
  ): FunctionsFactoryType & Realm.BaseFunctionsFactory {
    // Create a proxy, wrapping a simple object returning methods that calls functions
    // TODO: Lazily fetch available functions and return these from the ownKeys() trap
    const factory: Realm.BaseFunctionsFactory = new FunctionsFactory(fetcher, config);
    // Wrap the factory in a proxy that calls the internal call method
    return new Proxy(factory, {
      get(target, p, receiver) {
        if (typeof p === "string" && RESERVED_NAMES.indexOf(p) === -1) {
          return target.callFunction.bind(target, p);
        } else {
          const prop = Reflect.get(target, p, receiver);
          return typeof prop === "function" ? prop.bind(target) : prop;
        }
      },
    }) as FunctionsFactoryType & typeof factory;
  }

  /**
   * The underlying fetcher to use when requesting.
   */
  private readonly fetcher: Fetcher;

  /**
   * An optional name of the service in which functions are defined.
   */
  private readonly serviceName?: string;

  /**
   * Call this function to transform the arguments before they're sent to the service.
   */
  private readonly argsTransformation?: (args: unknown[]) => unknown[];

  /**
   * @param fetcher The underlying fetcher to use when sending requests.
   * @param config Additional configuration parameters.
   */
  constructor(fetcher: Fetcher, config: FunctionsFactoryConfiguration = {}) {
    this.fetcher = fetcher;
    this.serviceName = config.serviceName;
    this.argsTransformation = config.argsTransformation || cleanArgsAndSerialize;
  }

  /**
   * Call a remote function by it's name.
   * @param name Name of the remote function.
   * @param args Arguments to pass to the remote function.
   * @returns A promise of the value returned when executing the remote function.
   */
  async callFunction(name: string, ...args: unknown[]): Promise<unknown> {
    // See https://github.com/mongodb/stitch-js-sdk/blob/master/packages/core/sdk/src/services/internal/CoreStitchServiceClientImpl.ts
    const body: CallFunctionBody = {
      name,
      arguments: this.argsTransformation ? this.argsTransformation(args) : args,
    };
    if (this.serviceName) {
      body.service = this.serviceName;
    }
    const appRoute = this.fetcher.appRoute;
    return this.fetcher.fetchJSON({
      method: "POST",
      path: appRoute.functionsCall().path,
      body,
    });
  }

  /**
   * Call a remote function by it's name.
   * @param name Name of the remote function.
   * @param args Arguments to pass to the remote function.
   * @returns A promise of the value returned when executing the remote function.
   */
  public callFunctionStreaming(name: string, ...args: unknown[]): Promise<AsyncIterable<Uint8Array>> {
    const body: CallFunctionBody = {
      name,
      arguments: this.argsTransformation ? this.argsTransformation(args) : args,
    };
    if (this.serviceName) {
      body.service = this.serviceName;
    }
    const appRoute = this.fetcher.appRoute;
    const qs = encodeQueryString({
      ["baas_request"]: Base64.encode(JSON.stringify(body)),
    });
    return this.fetcher.fetchStream({
      method: "GET",
      path: appRoute.functionsCall().path + qs,
    });
  }
}
