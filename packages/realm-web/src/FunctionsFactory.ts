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

import { Fetcher } from "./Fetcher";
import { serialize } from "./utils/ejson";

/**
 * A list of names that functions cannot have to be callable through the functions proxy.
 */
const RESERVED_NAMES = ["inspect", "callFunction"];

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
    arguments: any[];
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
    argsTransformation?: (args: any[]) => any[];
}

/**
 * Remove the key for any fields with undefined values.
 *
 * @param args The arguments to clean.
 * @returns The cleaned arguments.
 */
function cleanArgs(args: any[]) {
    for (const arg of args) {
        if (typeof arg === "object") {
            for (const [key, value] of Object.entries(arg)) {
                if (value === undefined) {
                    delete arg[key];
                }
            }
        }
    }
    return args;
}

/**
 * Remove keys for any undefined values and serialize to EJSON.
 *
 * @param args The arguments to clean and serialize.
 * @returns The cleaned and serialized arguments.
 */
function cleanArgsAndSerialize(args: any[]) {
    const cleaned = cleanArgs(args);
    return cleaned.map(arg => (typeof arg === "object" ? serialize(arg) : arg));
}

/**
 * Defines how functions are called.
 */
export class FunctionsFactory {
    /**
     * Create a factory of functions, wrapped in a Proxy that returns bound copies of `callFunction` on any property.
     *
     * @param fetcher The underlying fetcher to use when requesting.
     * @param config Additional configuration parameters.
     * @returns The newly created factory of functions.
     */
    public static create<
        FunctionsFactoryType extends object = Realm.DefaultFunctionsFactory
    >(
        fetcher: Fetcher,
        config: FunctionsFactoryConfiguration = {},
    ): FunctionsFactoryType & Realm.BaseFunctionsFactory {
        // Create a proxy, wrapping a simple object returning methods that calls functions
        // TODO: Lazily fetch available functions and return these from the ownKeys() trap
        const factory: Realm.BaseFunctionsFactory = new FunctionsFactory(
            fetcher,
            config,
        );
        // Wrap the factory in a proxy that calls the internal call method
        return new Proxy<any>(factory, {
            get(target, p, receiver) {
                if (typeof p === "string" && RESERVED_NAMES.indexOf(p) === -1) {
                    return target.callFunction.bind(target, p);
                } else {
                    const prop = Reflect.get(target, p, receiver);
                    return typeof prop === "function"
                        ? prop.bind(target)
                        : prop;
                }
            },
        });
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
    private readonly argsTransformation?: (args: any[]) => any[];

    /**
     * @param fetcher The underlying fetcher to use when sending requests.
     * @param config Additional configuration parameters.
     */
    constructor(fetcher: Fetcher, config: FunctionsFactoryConfiguration = {}) {
        this.fetcher = fetcher;
        this.serviceName = config.serviceName;
        this.argsTransformation =
            config.argsTransformation || cleanArgsAndSerialize;
    }

    /**
     * Call a remote function by it's name.
     *
     * @param name Name of the remote function.
     * @param args Arguments to pass to the remote function.
     * @returns A promise of the value returned when executing the remote function.
     */
    async callFunction(name: string, ...args: any[]): Promise<any> {
        // See https://github.com/mongodb/stitch-js-sdk/blob/master/packages/core/sdk/src/services/internal/CoreStitchServiceClientImpl.ts
        const body: CallFunctionBody = {
            name,
            arguments: this.argsTransformation
                ? this.argsTransformation(args)
                : args,
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
}
