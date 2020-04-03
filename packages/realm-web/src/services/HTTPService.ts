import { Transport } from "../transports";
import { create as createFunctionsFactory } from "../FunctionsFactory";
import { deserialize } from "./utils";

export function createService(
    transport: Transport,
    serviceName: string = "http"
) {
    return new HTTPService(transport, serviceName);
}

// @see https://github.com/mongodb/stitch-js-sdk/blob/master/packages/core/services/http/src/internal/CoreHttpServiceClient.ts

class HTTPService implements Realm.Services.HTTP {
    private readonly functions: Realm.FunctionsFactory;

    constructor(transport: Transport, serviceName: string) {
        this.functions = createFunctionsFactory({
            transport,
            serviceName,
            responseTransformation: deserialize
        });
    }

    /**
     * Sends an HTTP GET request to the specified URL.
     * @param url The URL to send the request to.
     * @param options Options related to the request.
     */
    get(url: string, options: Realm.Services.HTTP.RequestOptions = {}) {
        return this.functions.get({ url, ...options });
    }

    /**
     * Sends an HTTP POST request to the specified URL.
     * @param url The URL to send the request to.
     * @param options Options related to the request.
     */
    post(url: string, options: Realm.Services.HTTP.RequestOptions = {}) {
        return this.functions.post({ url, ...options });
    }

    /**
     * Sends an HTTP PUT request to the specified URL.
     * @param url The URL to send the request to.
     * @param options Options related to the request.
     */
    put(url: string, options: Realm.Services.HTTP.RequestOptions = {}) {
        return this.functions.put({ url, ...options });
    }

    /**
     * Sends an HTTP DELETE request to the specified URL.
     * @param url The URL to send the request to.
     * @param options Options related to the request.
     */
    delete(url: string, options: Realm.Services.HTTP.RequestOptions = {}) {
        return this.functions.delete({ url, ...options });
    }

    /**
     * Sends an HTTP HEAD request to the specified URL.
     * @param url The URL to send the request to.
     * @param options Options related to the request.
     */
    head(url: string, options: Realm.Services.HTTP.RequestOptions = {}) {
        return this.functions.head({ url, ...options });
    }

    /**
     * Sends an HTTP PATCH request to the specified URL.
     * @param url The URL to send the request to.
     * @param options Options related to the request.
     */
    patch(url: string, options: Realm.Services.HTTP.RequestOptions = {}) {
        return this.functions.patch({ url, ...options });
    }
}
