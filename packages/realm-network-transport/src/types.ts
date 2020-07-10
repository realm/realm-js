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

export type Method = "GET" | "POST" | "DELETE" | "PUT";

export type Headers = { [name: string]: string };

export interface Request<RequestBody> {
    method: Method;
    url: string;
    timeoutMs?: number;
    headers?: Headers;
    body?: RequestBody | string;
}

export interface Response {
    statusCode: number;
    headers: Headers;
    body: string;
}

export type SuccessCallback = (response: Response) => void;

export type ErrorCallback = (err: Error) => void;

export interface ResponseHandler {
    onSuccess: SuccessCallback;
    onError: ErrorCallback;
}

export interface NetworkTransport {
    fetchAndParse<RequestBody extends any, ResponseBody extends any>(
        request: Request<RequestBody>,
    ): Promise<ResponseBody>;
    fetchWithCallbacks<RequestBody extends any>(
        request: Request<RequestBody>,
        handler: ResponseHandler,
    ): void;
}
