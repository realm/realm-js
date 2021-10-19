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
import { createRealmContext } from "../";

const dogSchema: Realm.ObjectSchema = {
  name: "dog",
  primaryKey: "_id",
  properties: {
    _id: "int",
    name: "string",
  },
};

const catSchema: Realm.ObjectSchema = {
  name: "cat",
  primaryKey: "_id",
  properties: {
    _id: "int",
    name: "string",
  },
};

const { RealmProvider, useRealm } = createRealmContext({
  schema: [dogSchema],
  inMemory: true,
  path: "testArtifacts/index",
});

describe("realm-react", () => {
  it("the context returns the configured realm with useRealm and closes on unmount", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => <RealmProvider>{children}</RealmProvider>;
    const { result, waitForNextUpdate, unmount } = renderHook(() => useRealm(), { wrapper });
    await waitForNextUpdate();
    const realm = result.current;
    expect(realm).not.toBe(null);
    expect(realm.schema[0].name).toBe("dog");
    unmount();
    expect(realm.isClosed).toBe(true);
  });
  it("the provider will override the state of the context", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RealmProvider schema={[catSchema]}>{children}</RealmProvider>
    );
    const { result, waitForNextUpdate } = renderHook(() => useRealm(), { wrapper });
    await waitForNextUpdate();
    const realm = result.current;
    expect(realm).not.toBe(null);
    expect(realm.schema[0].name).toBe("cat");
  });
});
