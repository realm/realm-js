import type { NetworkTransport, Request, SuccessCallback, ErrorCallback } from "realm-network-transport";

export class MockNetworkTransport implements NetworkTransport {
    public readonly requests: Request<any>[] = [];
    public readonly responses: object[];

    constructor(responses: object[] = []) {
        this.responses = responses;
    }

    public async fetchAndParse<RequestBody extends any, ResponseBody extends any>(
        request: Request<RequestBody>
    ): Promise<ResponseBody> {
        return this.fetch(request);
    }

    public fetchWithCallbacks<RequestBody extends any>(
        request: Request<RequestBody>,
        successCallback: SuccessCallback,
        errorCallback: ErrorCallback
    ): void {
        this.fetch(request, successCallback, errorCallback);
    }

    private async fetch(request: Request<any>) {
        this.requests.push(request);
        if (this.responses.length > 0) {
            const [ response ] = this.responses.splice(0, 1);
            return response as any;
        } else {
            throw new Error(`Unexpected request (method = ${request.method}, url = ${request.url}, body = ${JSON.stringify(request.body)})`);
        }
    }
}