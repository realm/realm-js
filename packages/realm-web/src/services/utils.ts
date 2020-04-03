import { EJSON } from "bson";

export function serialize(obj: object): any {
    return EJSON.serialize(obj);
}

export function deserialize(result: object | object[]): any {
    if (Array.isArray(result)) {
        return result.map((doc: any) => EJSON.deserialize(doc));
    } else {
        return EJSON.deserialize(result);
    }
}
