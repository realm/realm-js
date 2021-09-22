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

import React from "react";
import { renderHook } from "@testing-library/react-hooks";
import { createRealmContext } from "..";

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

const { RealmProvider, useRealm, useObject } = createRealmContext({
  schema: [dogSchema],
  inMemory: true,
});

const testDataSet = [
  { _id: 4, name: "Vincent" },
  { _id: 5, name: "River" },
  { _id: 6, name: "Schatzi" },
];

describe("useObject hook", () => {
  beforeEach(async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => <RealmProvider>{children}</RealmProvider>;
    const { result, waitForNextUpdate } = renderHook(() => useRealm(), { wrapper });
    await waitForNextUpdate();
    const realm = result.current;
    realm.write(() => {
      realm.deleteAll();
      testDataSet.forEach((data) => {
        realm.create("dog", data);
      });
    });
  });

  it("can retrieve a single object using useObject", async () => {
    const [, dog2] = testDataSet;

    const wrapper = ({ children }: { children: React.ReactNode }) => <RealmProvider>{children}</RealmProvider>;
    const { result: objectResult, waitForNextUpdate: waitForNextObjectUpdate } = renderHook(
      () => useObject<IDog>("dog", dog2._id),
      { wrapper },
    );
    await waitForNextObjectUpdate();

    const object = objectResult.current;

    expect(object.data).toMatchObject(dog2);
  });

  it("object is null", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => <RealmProvider>{children}</RealmProvider>;
    const { result: objectResult, waitForNextUpdate: waitForNextObjectUpdate } = renderHook(
      () => useObject<IDog>("dog", 12),
      { wrapper },
    );
    await waitForNextObjectUpdate();

    const object = objectResult.current;

    expect(object.data).toEqual(null);
  });
});
