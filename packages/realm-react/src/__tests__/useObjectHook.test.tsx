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

import { useEffect, useState } from "react";
import Realm, { flags } from "realm";
import { renderHook } from "@testing-library/react-native";
import { createUseObject } from "../useObject";

// Enable calling Realm.clearTestState()
flags.ALLOW_CLEAR_TEST_STATE = true;

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

const configuration = {
  schema: [dogSchema],
  path: "testArtifacts/use-object-hook.realm",
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

const useObject = createUseObject(useRealm);

const testDataSet = [
  { _id: 4, name: "Vincent" },
  { _id: 5, name: "River" },
  { _id: 6, name: "Schatzi" },
];

describe("useObject hook", () => {
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
    Realm.clearTestState;
  });

  it("can retrieve a single object using useObject", () => {
    const [, dog2] = testDataSet;

    const { result } = renderHook(() => useObject<IDog>("dog", dog2._id));

    const object = result.current;

    expect(object).toMatchObject(dog2);
  });

  it("object is null", () => {
    const { result } = renderHook(() => useObject<IDog>("dog", 12));

    const object = result.current;

    expect(object).toEqual(null);
  });
});
