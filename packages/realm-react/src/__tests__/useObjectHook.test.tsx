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
  },
};

interface IDog {
  _id: number;
  name: string;
}

const context = createRealmTestContext({ schema: [dogSchema] });
const useObject = createUseObject(context.useRealm);

const testDataSet = [
  { _id: 4, name: "Vincent" },
  { _id: 5, name: "River" },
  { _id: 6, name: "Schatzi" },
];

describe("useObject", () => {
  beforeEach(() => {
    context.openRealm();
    const { realm } = context;
    realm.write(() => {
      realm.deleteAll();
      testDataSet.forEach((data) => {
        realm.create("dog", data);
      });
    });
  });

  afterEach(() => {
    Realm.clearTestState();
  });

  it("can retrieve a single object using useObject", () => {
    const [, dog2] = testDataSet;
    const { result } = renderHook(() => useObject<IDog>("dog", dog2._id));
    const object = result.current;
    expect(object).toMatchObject(dog2);
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
        realm.create<IDog>("dog", { _id: 12, name: "Lassie" });
      });
      expect(renders).toHaveLength(2);
      expect(result.current?.name).toEqual("Lassie");
    });
  });
});
