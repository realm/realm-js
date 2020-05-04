/**
 * TODO: Determine if the shape of an error response is specific to each service or widely used
 */
export class MongoDBRealmError extends Error {
    public readonly statusCode: number;
    public readonly statusText: string;
    public readonly errorCode: string;
    public readonly link: string;

    constructor(statusCode: number, statusText: string, response: any) {
        if (
            typeof response === "object" &&
            typeof response.error === "string" &&
            typeof response.error_code === "string" &&
            typeof response.link === "string"
        ) {
            super(`${response.error} (status ${statusCode} ${statusText})`);
            this.errorCode = response.error_code;
            this.link = response.link;
            this.statusCode = statusCode;
            this.statusText = statusText;
        } else {
            throw new Error("Unexpected error response format");
        }
    }
}
