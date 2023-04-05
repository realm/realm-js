////////////////////////////////////////////////////////////////////////////
//
// Copyright 2021 Realm Inc.
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
import Realm, { flags } from "realm";
import { useState, useEffect } from "react";
import { renderHook } from "@testing-library/react-native";
import { createUseQuery } from "../useQuery";

// Enable calling Realm.clearTestState()
flags.ALLOW_CLEAR_TEST_STATE = true;

const dogSchema: Realm.ObjectSchema = {
  name: "dog",
  primaryKey: "_id",
  properties: {
    _id: "int",
    name: "string",
    color: "string",
    age: "int",
    gender: "string",
  },
};

interface IDog {
  _id: number;
  name: string;
  color: string;
  age: number;
  gender: string;
}
const configuration: Realm.Configuration = {
  schema: [dogSchema],
  path: "testArtifacts/use-query-hook.realm",
  deleteRealmIfMigrationNeeded: true,
};

const useRealm = () => {
  const [realm, setRealm] = useState(new Realm(configuration));
  useEffect(() => {
    return () => {
      realm.close();
    };
  }, [realm, setRealm]);

  return new Realm(configuration);
};

const useQuery = createUseQuery(useRealm);

const testDataSet = [
  { _id: 1, name: "Vincent", color: "black and white", gender: "male", age: 4 },
  { _id: 2, name: "River", color: "brown", gender: "female", age: 12 },
  { _id: 3, name: "Schatzi", color: "beige", gender: "female", age: 10 },
  { _id: 4, name: "Victor", color: "dark brown", gender: "male", age: 18 },
  { _id: 5, name: "Jazz", color: "dark brown", gender: "female", age: 12 },
  { _id: 6, name: "Sadie", color: "gold", gender: "female", age: 5 },
];

describe("useQueryHook", () => {
  beforeEach(() => {
    const realm = new Realm(configuration);
    realm.write(() => {
      realm.deleteAll();
      testDataSet.forEach((data) => {
        realm.create("dog", data);
      });
    });
    realm.close();
  });

  afterEach(() => {
    Realm.clearTestState();
  });

  it("can retrieve collections using useQuery", () => {
    const { result } = renderHook(() => useQuery<IDog>("dog"));
    const collection = result.current;

    const [dog1, dog2, dog3] = testDataSet;

    expect(collection).not.toBeNull();
    expect(collection.length).toBe(6);
    expect(collection[0]).toMatchObject(dog1);
    expect(collection[1]).toMatchObject(dog2);
    expect(collection[2]).toMatchObject(dog3);
  });
  it("returns the same collection reference if there are no changes", () => {
    const { result } = renderHook(() => useQuery<IDog>("dog"));
    const collection = result.current;

    expect(collection).not.toBeNull();
    expect(collection.length).toBe(6);
    expect(collection[0]).toEqual(collection?.[0]);
  });
  it("should return undefined indexes that are out of bounds", () => {
    const { result } = renderHook(() => useQuery<IDog>("dog"));
    const collection = result.current;

    expect(collection[99]).toBe(undefined);
  });
});
