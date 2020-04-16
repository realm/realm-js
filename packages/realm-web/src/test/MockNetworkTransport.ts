import {
    NetworkTransport,
    SuccessCallback,
    ErrorCallback,
    Request,
} from "realm-network-transport";

/**
 * Perform mocked requests and get pre-recorded responses
 */
export class MockNetworkTransport implements NetworkTransport {
    /** List of all requests captured */
    public readonly requests: Request<any>[] = [];

    /** Responses sent back on each expected request */
    public readonly responses: any[];

    /**
     * Construct a mocked network transport which returns pre-recorded requests.
     *
     * @param responses An array of pre-recorded requests.
     */
    constructor(responses: object[] = []) {
        this.responses = responses;
    }

    /** @inheritdoc */
    fetchAndParse<RequestBody extends any, ResponseBody extends any>(
        request: Request<RequestBody>,
    ): Promise<ResponseBody> {
        if (!request.headers || Object.keys(request.headers).length === 0) {
            delete request.headers;
        }
        if (!request.body) {
            delete request.body;
        }
        this.requests.push(request);
        if (this.responses.length > 0) {
            const [response] = this.responses.splice(0, 1);
            return Promise.resolve(response);
        } else {
            throw new Error(
                `Unexpected request (method = ${request.method}, url = ${
                    request.url
                }, body = ${JSON.stringify(request.body)})`,
            );
        }
    }

    /** @inheritdoc */
    fetchWithCallbacks<RequestBody extends any>(
        request: Request<RequestBody>,
        successCallback: SuccessCallback,
        errorCallback: ErrorCallback,
    ) {
        this.fetchAndParse(request).then(successCallback, errorCallback);
    }
}
