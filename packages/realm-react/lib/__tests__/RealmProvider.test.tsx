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
import React, { useState } from "react";
import "@testing-library/jest-native/extend-expect";
import { renderHook, act } from "@testing-library/react-hooks";
import { createRealmContext } from "..";
import { View, Button, Text } from "react-native";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { ReactTestInstance } from "react-test-renderer";

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
  path: "testArtifacts/RealmProvider",
});

describe("RealmProvider", () => {
  it("returns the configured realm with useRealm and closes on unmount", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => <RealmProvider>{children}</RealmProvider>;
    const { result, waitForNextUpdate, unmount } = renderHook(() => useRealm(), { wrapper });
    await waitForNextUpdate();
    const realm = result.current;
    expect(realm).not.toBe(null);
    expect(realm.schema[0].name).toBe("dog");
    unmount();
    expect(realm.isClosed).toBe(true);
  });
  it("will override the the configuration provided in createRealmContext", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RealmProvider schema={[catSchema]}>{children}</RealmProvider>
    );
    const { result, waitForNextUpdate } = renderHook(() => useRealm(), { wrapper });
    await waitForNextUpdate();
    const realm = result.current;
    expect(realm).not.toBe(null);
    expect(realm.schema[0].name).toBe("cat");
  });
  it("can be provided in multiple parts of an application", async () => {
    const RealmComponent = () => {
      const realm = useRealm();
      return (
        <Button
          testID="action"
          title="toggle"
          onPress={() =>
            realm.write(() => {
              realm.create("dog", { _id: new Date().getTime(), name: "Rex" });
            })
          }
        />
      );
    };
    const App = () => {
      const [toggleComponent, setToggleComponent] = useState(true);
      return (
        <>
          <View testID="firstRealmProvider">
            <RealmProvider>
              <RealmComponent />
            </RealmProvider>
          </View>
          {toggleComponent && (
            <View testID="secondRealmProvider">
              <RealmProvider></RealmProvider>
            </View>
          )}
          <Button testID="toggle" title="toggle" onPress={() => setToggleComponent(!toggleComponent)} />
        </>
      );
    };
    const { getByTestId } = render(<App />);
    const secondRealmProvider: ReactTestInstance = getByTestId("secondRealmProvider");
    const toggleComponent = getByTestId("toggle");
    const actionComponent = await waitFor(() => getByTestId("action"));

    expect(secondRealmProvider).not.toBeEmpty();

    await act(async () => {
      fireEvent.press(toggleComponent as ReactTestInstance);
    });
    expect(() => getByTestId("secondRealmProvider")).toThrow(
      "Unable to find an element with testID: secondRealmProvider",
    );

    // This is actually a bug that we need to fix on a deeper level
    await act(async () => {
      expect(() => fireEvent.press(actionComponent as ReactTestInstance)).toThrow(
        "Cannot access realm that has been closed.",
      );
    });
  });
  it("handle state changes to its configuration", async () => {
    const RealmComponent = () => {
      const realm = useRealm();
      return <Text testID="schemaName">{realm.schema[0].name}</Text>;
    };
    const App = () => {
      const [schema, setSchema] = useState(dogSchema);
      return (
        <>
          <View testID="firstRealmProvider">
            <RealmProvider schema={[schema]}>
              <RealmComponent />
            </RealmProvider>
          </View>
          <Button testID="changeSchema" title="change schema" onPress={() => setSchema(catSchema)} />
        </>
      );
    };
    const { getByTestId } = render(<App />);
    const schemaNameContainer = await waitFor(() => getByTestId("schemaName"));
    const changeSchemaButton = getByTestId("changeSchema");

    expect(schemaNameContainer).toHaveTextContent("dog");

    await act(async () => {
      fireEvent.press(changeSchemaButton as ReactTestInstance);
    });

    // Changing the realm provider configuration will cause a comlete new remount
    // of the child component.  Therefore it must be retreived again
    const newSchemaNameContainer = getByTestId("schemaName");

    expect(newSchemaNameContainer).toHaveTextContent("cat");
  });
});
