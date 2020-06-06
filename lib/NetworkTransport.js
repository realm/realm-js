function __awaiter(thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

class MongoDBRealmError extends Error {
    constructor(statusCode, statusText, response) {
        if (typeof response === "object" &&
            typeof response.error === "string") {
            super(`${response.error} (status ${statusCode} ${statusText})`);
            this.statusText = statusText;
            this.statusCode = statusCode;
            this.errorCode = response.error_code;
            this.link = response.link;
        }
        else {
            throw new Error("Unexpected error response format");
        }
    }
}

////////////////////////////////////////////////////////////////////////////
const isNodeProcess = typeof process === "object" && "node" in process.versions;
class DefaultNetworkTransport {
    constructor() {
        // Determine the fetch implementation
        if (!DefaultNetworkTransport.fetch) {
            // Try to get it from the global
            if (typeof fetch === "function" && typeof window === "object") {
                DefaultNetworkTransport.fetch = fetch.bind(window);
            }
            else if (isNodeProcess && typeof require === "function") {
                // Making it harder for the static analyzers see this require call
                const nodeRequire = require;
                DefaultNetworkTransport.fetch = nodeRequire("node-fetch");
            }
            else {
                throw new Error("DefaultNetworkTransport.fetch must be set before it's used");
            }
        }
        // Determine the AbortController implementation
        if (!DefaultNetworkTransport.AbortController) {
            if (typeof AbortController !== "undefined") {
                DefaultNetworkTransport.AbortController = AbortController;
            }
            else if (isNodeProcess && typeof require === "function") {
                // Making it harder for the static analyzers see this require call
                const nodeRequire = require;
                DefaultNetworkTransport.AbortController = nodeRequire("abort-controller");
            }
            else {
                throw new Error("DefaultNetworkTransport.AbortController must be set before it's used");
            }
        }
    }
    fetchAndParse(request) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield this.fetch(request);
                const contentType = response.headers.get("content-type");
                if (response.ok) {
                    if (contentType === null) {
                        return null;
                    }
                    else if (contentType.startsWith("application/json")) {
                        // Awaiting the response to ensure we'll throw our own error
                        return yield response.json();
                    }
                    else {
                        throw new Error("Expected an empty or a JSON response");
                    }
                }
                else if (contentType &&
                    contentType.startsWith("application/json")) {
                    throw new MongoDBRealmError(response.status, response.statusText, yield response.json());
                }
                else {
                    if (contentType && contentType.startsWith("application/json")) {
                        // Awaiting the response to ensure we'll throw our own error
                        const json = yield response.json();
                        throw new MongoDBRealmError(response.status, response.statusText, json);
                    }
                    else {
                        throw new Error(`Unexpected status code (${response.status} ${response.statusText})`);
                    }
                }
            }
            catch (err) {
                throw new Error(`Request failed (${request.method} ${request.url}): ${err.message}`);
            }
        });
    }
    fetchWithCallbacks(request, handler) {
        // tslint:disable-next-line: no-console
        this.fetch(request)
            .then((response) => __awaiter(this, void 0, void 0, function* () {
            const decodedBody = yield response.text();
            // Pull out the headers of the response
            const responseHeaders = {};
            response.headers.forEach((value, key) => {
                responseHeaders[key] = value;
            });
            return {
                statusCode: response.status,
                headers: responseHeaders,
                body: decodedBody,
            };
        }))
            .then(r => handler.onSuccess(r))
            .catch(e => handler.onError(e));
    }
    fetch(request) {
        return __awaiter(this, void 0, void 0, function* () {
            const { method, url, body, timeoutMs, headers = DefaultNetworkTransport.DEFAULT_HEADERS, } = request;
            const { signal, cancelTimeout } = this.createTimeoutSignal(timeoutMs);
            try {
                // We'll await the response to catch throw our own error
                return yield DefaultNetworkTransport.fetch(url, {
                    method,
                    headers,
                    body: typeof body === "string" ? body : JSON.stringify(body),
                    signal,
                });
            }
            finally {
                // Whatever happens, cancel any timeout
                cancelTimeout();
            }
        });
    }
    createTimeoutSignal(timeoutMs) {
        if (typeof timeoutMs === "number") {
            const controller = new DefaultNetworkTransport.AbortController();
            // Call abort after a specific number of milliseconds
            const timeout = setTimeout(() => {
                controller.abort();
            }, timeoutMs);
            return {
                signal: controller.signal,
                cancelTimeout: () => {
                    clearTimeout(timeout);
                },
            };
        }
        else {
            return {
                signal: undefined,
                cancelTimeout: () => {
                    /* No-op */
                },
            };
        }
    }
}
DefaultNetworkTransport.DEFAULT_HEADERS = {
    Accept: "application/json",
    "Content-Type": "application/json",
};

export { DefaultNetworkTransport };
