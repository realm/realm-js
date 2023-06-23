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

import { EJSON } from "bson";

type SimpleObject = Record<string, unknown>;

const SERIALIZATION_OPTIONS = {
  relaxed: false, // Ensure Canonical mode
};

/**
 * Serialize an object containing BSON types into extended-JSON.
 * @param obj The object containing BSON types.
 * @returns The document in extended-JSON format.
 */
export function serialize<Obj extends SimpleObject>(obj: Obj): SimpleObject {
  return EJSON.serialize(obj, SERIALIZATION_OPTIONS);
}

/**
 * De-serialize an object or an array of object from extended-JSON into an object or an array of object with BSON types.
 * @param obj The object or array of objects in extended-JSON format.
 * @returns The object or array of objects with inflated BSON types.
 */
export function deserialize(obj: SimpleObject | SimpleObject[]): EJSON.SerializableTypes {
  if (Array.isArray(obj)) {
    return obj.map((doc) => EJSON.deserialize(doc));
  } else {
    return EJSON.deserialize(obj);
  }
}
