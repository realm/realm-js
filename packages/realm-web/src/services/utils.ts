import { EJSON } from "bson";

/**
 * Serialize an object containing BSON types into extended-JSON.
 *
 * @param obj The object containing BSON types.
 * @returns The document in extended-JSON format.
 */
export function serialize(obj: object): object {
    return EJSON.serialize(obj);
}

/**
 * De-serialize an object or an array of object from extended-JSON into an object or an array of object with BSON types.
 *
 * @param obj The object or array of objects in extended-JSON format.
 * @returns The object or array of objects with inflated BSON types.
 */
export function deserialize(obj: object | object[]): object {
    if (Array.isArray(obj)) {
        return obj.map((doc: any) => EJSON.deserialize(doc));
    } else {
        return EJSON.deserialize(obj);
    }
}
