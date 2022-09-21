import type { ObjectSchema } from "realm";
export declare function transformProperty(propertyCode: string): babel.BabelFileResult;
export declare function extractSchema(result: babel.BabelFileResult): ObjectSchema | undefined;
