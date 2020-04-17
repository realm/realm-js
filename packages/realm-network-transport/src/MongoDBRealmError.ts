/**
 * TODO: Determine if the shape of an error response is specific to each service or widely used
 */
export class MongoDBRealmError extends Error {
    public readonly statusCode: number;
    public readonly statusText: string;
    public readonly errorCode: string | undefined;
    public readonly link: string | undefined;

    constructor(statusCode: number, statusText: string, response: any) {
        if (
            typeof response === "object" &&
            typeof response.error === "string"
        ) {
            super(`${response.error} (status ${statusCode} ${statusText})`);
            this.statusText = statusText;
            this.statusCode = statusCode;
            this.errorCode = response.error_code;
            this.link = response.link;
        } else {
            throw new Error("Unexpected error response format");
        }
    }
}
