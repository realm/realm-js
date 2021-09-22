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

import { createRealmContext } from "..";
import { renderHook } from "@testing-library/react-hooks";

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

const { RealmProvider, useRealm, useQuery } = createRealmContext({
  schema: [dogSchema],
  path: "useObjectRealm",
  inMemory: true,
});

const testDataSet = [
  { _id: 4, name: "Vincent" },
  { _id: 5, name: "River" },
  { _id: 6, name: "Schatzi" },
];

describe("useQuery", () => {
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
  it("can retrieve collections using useQuery", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => <RealmProvider>{children}</RealmProvider>;
    const { result, waitForNextUpdate } = renderHook(() => useQuery<IDog>("dog"), { wrapper });
    await waitForNextUpdate();
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
});
