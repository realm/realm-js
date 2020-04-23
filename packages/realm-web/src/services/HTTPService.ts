import { Transport } from "../transports";
import { create as createFunctionsFactory } from "../FunctionsFactory";
import { deserialize } from "./utils";

// @see https://github.com/mongodb/stitch-js-sdk/blob/master/packages/core/services/http/src/internal/CoreHttpServiceClient.ts

/**
 * The Stitch HTTP Service is a generic interface that enables you to communicate with any service that is available over HTTP.
 *
 * @see https://docs.mongodb.com/stitch/services/http/
 */
class HTTPService implements Realm.Services.HTTP {
    /**
     * The functions factory interface to use when sending requests.
     */
    private readonly functions: Realm.DefaultFunctionsFactory;

    /**
     * Construct an HTTP Service
     *
     * @param transport The underlying transport
     * @param serviceName An optional service name
     */
    constructor(transport: Transport, serviceName = "http") {
        this.functions = createFunctionsFactory(transport, {
            serviceName,
            responseTransformation: deserialize,
        });
    }

    /**
     * Sends an HTTP GET request to the specified URL.
     *
     * @param url The URL to send the request to.
     * @param options Options related to the request.
     * @returns The response.
     */
    get(url: string, options: Realm.Services.HTTP.RequestOptions = {}) {
        return this.functions.get({ url, ...options });
    }

    /**
     * Sends an HTTP POST request to the specified URL.
     *
     * @param url The URL to send the request to.
     * @param options Options related to the request.
     * @returns The response.
     */
    post(url: string, options: Realm.Services.HTTP.RequestOptions = {}) {
        return this.functions.post({ url, ...options });
    }

    /**
     * Sends an HTTP PUT request to the specified URL.
     *
     * @param url The URL to send the request to.
     * @param options Options related to the request.
     * @returns The response.
     */
    put(url: string, options: Realm.Services.HTTP.RequestOptions = {}) {
        return this.functions.put({ url, ...options });
    }

    /**
     * Sends an HTTP DELETE request to the specified URL.
     *
     * @param url The URL to send the request to.
     * @param options Options related to the request.
     * @returns The response.
     */
    delete(url: string, options: Realm.Services.HTTP.RequestOptions = {}) {
        return this.functions.delete({ url, ...options });
    }

    /**
     * Sends an HTTP HEAD request to the specified URL.
     *
     * @param url The URL to send the request to.
     * @param options Options related to the request.
     * @returns The response.
     */
    head(url: string, options: Realm.Services.HTTP.RequestOptions = {}) {
        return this.functions.head({ url, ...options });
    }

    /**
     * Sends an HTTP PATCH request to the specified URL.
     *
     * @param url The URL to send the request to.
     * @param options Options related to the request.
     * @returns The response.
     */
    patch(url: string, options: Realm.Services.HTTP.RequestOptions = {}) {
        return this.functions.patch({ url, ...options });
    }
}

/**
 * Creates an HTTP Service.
 * Note: This method exists to enable function binding.
 *
 * @param transport The underlying transport
 * @param serviceName An optional service name
 * @returns The new HTTP Service
 */
export function createService(transport: Transport, serviceName = "http") {
    return new HTTPService(transport, serviceName);
}
