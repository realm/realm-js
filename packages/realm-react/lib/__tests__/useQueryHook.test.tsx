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
import Realm from "realm";
import { useState, useEffect } from "react";
import { renderHook } from "@testing-library/react-hooks";
import { createUseQuery } from "../useQuery";

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
  path: "testArtifacts/useQueryRealm",
  deleteRealmIfMigrationNeeded: true,
};

const useRealm = () => {
  const [realm, setRealm] = useState<Realm | null>(new Realm(configuration));
  useEffect(() => {
    return () => {
      realm?.close();
      setRealm(null);
    };
  }, [realm, setRealm]);

  return new Realm(configuration);
};

const useQuery = createUseQuery(useRealm);

const testDataSet = [
  { _id: 2, name: "River", color: "brown", gender: "female", age: 12 },
  { _id: 3, name: "Schatzi", color: "beige", gender: "female", age: 10 },
  { _id: 4, name: "Victor", color: "dark brown", gender: "male", age: 18 },
  { _id: 1, name: "Vincent", color: "black and white", gender: "male", age: 4 },
  { _id: 5, name: "Jazz", color: "dark brown", gender: "female", age: 12 },
  { _id: 6, name: "Sadie", color: "gold", gender: "female", age: 5 },
];

describe("useQuery", () => {
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
  it("can retrieve collections using useQuery", () => {
    const { result } = renderHook(() => useQuery<IDog>("dog"));
    const collection = result.current;

    const [dog1, dog2, dog3] = testDataSet;

    if (collection !== undefined) {
      const { data } = collection;
      if (data) {
        expect(data?.[0]).toMatchObject(dog1);
        expect(data?.[1]).toMatchObject(dog2);
        expect(data?.[2]).toMatchObject(dog3);
      }
    }
  });
  it("can filter with a interpolation", () => {
    const { result } = renderHook(() => useQuery<IDog>("dog", (q) => q.filtered("gender == $0", "female")));
    const collection = result.current;

    expect(collection.data?.length).toBe(4);
  });
  it("can filter with a string", () => {
    const { result } = renderHook(() => useQuery<IDog>("dog", (q) => q.filtered("gender == 'female'")));
    const collection = result.current;

    expect(collection.data?.length).toBe(4);
  });
  it("can sort by a value", () => {
    const { result } = renderHook(() => useQuery<IDog>("dog", (q) => q.sorted("age")));
    const collection = result.current;

    expect(collection.data?.[0]?.name).toBe("Vincent");
  });
  it("can sort by a value and be reversed", () => {
    const { result } = renderHook(() => useQuery<IDog>("dog", (q) => q.sorted("age", true)));
    const collection = result.current;

    expect(collection.data?.[0]?.name).toBe("Victor");
  });
  it("can sort by a value and be reversed in array form", () => {
    const { result } = renderHook(() => useQuery<IDog>("dog", (q) => q.sorted([["age", true]])));
    const collection = result.current;

    expect(collection.data?.[0]?.name).toBe("Victor");
  });
  it("can filter and sort", () => {
    const { result } = renderHook(() => useQuery<IDog>("dog", (q) => q.filtered("gender == 'female'").sorted("age")));
    const collection = result.current;

    expect(collection.data?.length).toBe(4);
    expect(collection.data?.[0]?.age).toBe(5);
    expect(collection.data?.[1]?.age).toBe(10);
    expect(collection.data?.[2]?.age).toBe(12);
    expect(collection.data?.[3]?.age).toBe(12);
  });
});
