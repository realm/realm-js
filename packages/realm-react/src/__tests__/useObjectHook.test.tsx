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

import { createUseObject } from "../useObject";
import { createRealmTestContext } from "./createRealmTestContext";
import { profileHook } from "./profileHook";

const dogSchema: Realm.ObjectSchema = {
  name: "dog",
  primaryKey: "_id",
  properties: {
    _id: "int",
    name: "string",
    age: "int",
  },
};

interface IDog {
  _id: number;
  name: string;
  age: number;
}

const context = createRealmTestContext({ schema: [dogSchema] });
const useObject = createUseObject(context.useRealm);

const testDataSet = [
  { _id: 4, name: "Vincent", age: 5 },
  { _id: 5, name: "River", age: 25 },
  { _id: 6, name: "Schatzi", age: 13 },
];

describe("useObject", () => {
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

  it("can retrieve a single object using useObject", () => {
    const [, river] = testDataSet;
    const { result } = renderHook(() => useObject<IDog>("dog", river._id));
    const object = result.current;
    expect(object).toMatchObject(river);
  });

  describe("missing objects", () => {
    it("return null", () => {
      const { result } = renderHook(() => useObject<IDog>("dog", 12));
      expect(result.current).toEqual(null);
    });

    it("rerenders and return object once created", () => {
      const { write, realm } = context;
      const { result, renders } = profileHook(() => useObject<IDog>("dog", 12));
      expect(renders).toHaveLength(1);
      expect(result.current).toEqual(null);
      write(() => {
        realm.create<IDog>("dog", { _id: 12, name: "Lassie", age: 32 });
      });
      expect(renders).toHaveLength(2);
      expect(result.current?.name).toEqual("Lassie");
    });
  });

  describe("key-path filtering", () => {
    it("can filter notifications using key-path array", async () => {
      const [vincent] = testDataSet;
      const { write } = context;
      const { result, renders } = profileHook(() => useObject<IDog>("dog", vincent._id, ["name"]));
      expect(renders).toHaveLength(1);
      expect(result.current).toMatchObject(vincent);
      // Update the name and expect a re-render
      write(() => {
        if (result.current) {
          result.current.name = "Vince!";
        }
      });
      expect(renders).toHaveLength(2);
      expect(result.current?.name).toEqual("Vince!");
      // Update the age and don't expect a re-render
      write(() => {
        if (result.current) {
          result.current.age = 5;
        }
      });
      expect(renders).toHaveLength(2);
    });

    it("can filter notifications using key-path string", async () => {
      const [vincent] = testDataSet;
      const { write } = context;
      const { result, renders } = profileHook(() => useObject<IDog>("dog", vincent._id, "age"));
      expect(renders).toHaveLength(1);
      expect(result.current).toMatchObject(vincent);
      // Update the name and expect a re-render
      write(() => {
        if (result.current) {
          result.current.age = 13;
        }
      });
      expect(renders).toHaveLength(2);
      expect(result.current?.age).toEqual(13);
      // Update the age and don't expect a re-render
      write(() => {
        if (result.current) {
          result.current.name = "Vince!";
        }
      });
      expect(renders).toHaveLength(2);
    });
  });
});
