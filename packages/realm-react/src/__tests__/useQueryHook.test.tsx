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
import { renderHook } from "@testing-library/react-native";

import { createUseQuery } from "../useQuery";
import { profileHook } from "./profileHook";
import { createRealmTestContext } from "./createRealmTestContext";

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

const testDataSet = [
  { _id: 1, name: "Vincent", color: "black and white", gender: "male", age: 4 },
  { _id: 2, name: "River", color: "brown", gender: "female", age: 12 },
  { _id: 3, name: "Schatzi", color: "beige", gender: "female", age: 10 },
  { _id: 4, name: "Victor", color: "dark brown", gender: "male", age: 18 },
  { _id: 5, name: "Jazz", color: "dark brown", gender: "female", age: 12 },
  { _id: 6, name: "Sadie", color: "gold", gender: "female", age: 5 },
];

describe("useQuery", () => {
  const context = createRealmTestContext({ schema: [dogSchema] });
  const useQuery = createUseQuery(context.useRealm);

  beforeEach(() => {
    const realm = context.openRealm();
    realm.write(() => {
      realm.deleteAll();
      testDataSet.forEach((data) => {
        realm.create("dog", data);
      });
    });
  });

  afterEach(() => {
    context.cleanup();
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

  it("can filter objects via type and callback", () => {
    const { result } = renderHook(() => useQuery<IDog>("dog", (dogs) => dogs.filtered("age > 10")));
    expect(result.current.length).toBe(3);
  });

  describe("passing an object of options as argument", () => {
    it("can filter objects via a 'query' property", () => {
      const { result, renders } = profileHook(() =>
        useQuery<IDog>({
          type: "dog",
          query: (dogs) => dogs.filtered("age > 10"),
        }),
      );
      expect(result.current.length).toBe(3);
      expect(renders).toHaveLength(1);
    });

    it("can update filter objects via a 'query' property", () => {
      const { result, renders, rerender } = profileHook(
        ({ age }) =>
          useQuery<IDog>(
            {
              type: "dog",
              query: (dogs) => dogs.filtered("age > $0", age),
            },
            [age],
          ),
        { initialProps: { age: 10 } },
      );
      expect(result.current.length).toBe(3);
      expect(renders).toHaveLength(1);

      // Update the query to filter for a different age
      rerender({ age: 15 });
      expect(result.current.length).toBe(1);
      expect(renders).toHaveLength(2);
    });

    it("can filter notifications using key-path array", async () => {
      const { write } = context;
      const { result, renders } = profileHook(() =>
        useQuery<IDog>({
          type: "dog",
          query: (dogs) => dogs.filtered("age > 10"),
          keyPaths: ["name"],
        }),
      );

      const initialCollection = result.current;
      expect(initialCollection).toHaveLength(3);
      expect(renders).toHaveLength(1);

      // Updating a name in the database and expect a render
      const [firstDog] = result.current;
      expect(firstDog.name).toEqual("River");
      write(() => {
        firstDog.name = "Rivery!";
      });
      expect(renders).toHaveLength(2);
      expect(initialCollection).not.toBe(result.current);

      // Updating an age in the database and don't expect a render
      expect(firstDog.age).toEqual(12);
      write(() => {
        firstDog.age = 13;
      });
      expect(renders).toHaveLength(2);
    });

    it("can filter notifications using key-path string", async () => {
      const { write } = context;
      const { result, renders } = profileHook(() =>
        useQuery<IDog>({
          type: "dog",
          query: (dogs) => dogs.filtered("name != $0", "Vincent"),
          keyPaths: "age",
        }),
      );

      const initialCollection = result.current;
      expect(initialCollection).toHaveLength(5);
      expect(renders).toHaveLength(1);

      // Updating an age in the database and expect a render
      const [firstDog] = result.current;
      expect(firstDog.name).toEqual("River");
      write(() => {
        firstDog.age = 16;
      });
      expect(renders).toHaveLength(2);
      expect(initialCollection).not.toBe(result.current);

      // Updating a name in the database and don't expect a render
      expect(firstDog.age).toEqual(16);
      write(() => {
        firstDog.name = "Rivery!";
      });
      expect(renders).toHaveLength(2);
    });
  });
});
