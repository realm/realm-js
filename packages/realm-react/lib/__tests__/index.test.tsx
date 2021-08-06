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
//import React from "react";
import React from "react";
import { act, renderHook } from "@testing-library/react-hooks";
import { createRealmContext } from "../";
import Realm from "realm";
import { ObjectId } from "bson";

const dogSchema: Realm.ObjectSchema = {
  name: "dog",
  primaryKey: "_id",
  properties: {
    _id: "objectId",
    name: "string",
  },
};

interface IDog {
  _id: ObjectId;
  name: string;
}

const { RealmProvider, useRealm, useQuery, useObject } = createRealmContext({
  schema: [dogSchema],
  inMemory: true,
});

describe("realm-react", () => {
  afterAll(async () => {
    Realm.clearTestState();
  }),
    it("the context returns the configured realm with useRealm", async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => <RealmProvider>{children}</RealmProvider>;
      const { result, waitForNextUpdate } = renderHook(() => useRealm(), { wrapper });
      await waitForNextUpdate();
      const realm = result.current;
      expect(realm).not.toBe(null);
      expect(realm.schema[0].name).toBe("dog");
    });
});
describe("useQuery", () => {
  it("can retrieve collections using useQuery", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => <RealmProvider>{children}</RealmProvider>;
    const { result, waitForNextUpdate } = renderHook(
      () => {
        return { realm: useRealm(), collection: useQuery<IDog>("dog") };
      },
      { wrapper },
    );
    await waitForNextUpdate();
    const { realm, collection } = result.current;

    const [dog1, dog2, dog3] = [
      { _id: new Realm.BSON.ObjectId(), name: "Vincent" },
      { _id: new Realm.BSON.ObjectId(), name: "River" },
      { _id: new Realm.BSON.ObjectId(), name: "Schatzi" },
    ];
    act(() => {
      realm.write(() => {
        realm.create("dog", dog1);
        realm.create("dog", dog2);
        realm.create("dog", dog3);
      });
    });

    if (collection !== undefined) {
      const { data } = collection;
      if (data) {
        expect(data?.[0]).toMatchObject(dog1);
        expect(data?.[1]).toMatchObject(dog2);
        expect(data?.[2]).toMatchObject(dog3);

        act(() => {
          realm.write(() => {
            data[0].name = "Vinny";
          });
        });
      }
    }
  });
});
describe("useObject", () => {
  it("can retrieve a single object using useObject", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => <RealmProvider>{children}</RealmProvider>;
    const { result, waitForNextUpdate } = renderHook(() => useRealm(), { wrapper });
    await waitForNextUpdate();
    const realm = result.current;
    const [dog1, dog2, dog3] = [
      { _id: new Realm.BSON.ObjectId(), name: "Vincent" },
      { _id: new Realm.BSON.ObjectId(), name: "River" },
      { _id: new Realm.BSON.ObjectId(), name: "Schatzi" },
    ];
    act(() => {
      realm?.write(() => {
        realm?.create("dog", dog1);
        realm?.create("dog", dog2);
        realm?.create("dog", dog3);
      });
    });
    const { result: resultObject, waitForNextUpdate: waitForNextUpdateObject } = renderHook(
      () => useObject<IDog>("dog", dog2._id),
      { wrapper },
    );
    await waitForNextUpdateObject();

    expect(resultObject.current.data).toMatchObject(dog2);
  });
});
