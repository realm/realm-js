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
import React, { useRef, useState } from "react";
import Realm, { User } from "realm";
import "@testing-library/jest-native/extend-expect";
import { createRealmContext } from "..";
import { mergeRealmConfiguration, areConfigurationsIdentical } from "../RealmProvider";
import { View, Button, Text } from "react-native";
import { render, fireEvent, waitFor, renderHook, act } from "@testing-library/react-native";

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
  path: "testArtifacts/realm-provider.realm",
});

const EmptyRealmContext = createRealmContext();

describe("RealmProvider", () => {
  afterEach(() => {
    Realm.clearTestState();
  });

  it("returns the configured realm with useRealm and closes on unmount", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => <RealmProvider>{children}</RealmProvider>;
    const { result, unmount } = renderHook(() => useRealm(), { wrapper });
    await waitFor(() => expect(result.current).not.toBe(null));
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
    const { result } = renderHook(() => useRealm(), { wrapper });
    await waitFor(() => expect(result.current).not.toBe(null));
    const realm = result.current;
    expect(realm).not.toBe(null);
    expect(realm.schema[0].name).toBe("cat");
  });
  it("can be used with an initially empty realm context", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <EmptyRealmContext.RealmProvider schema={[catSchema]}>{children}</EmptyRealmContext.RealmProvider>
    );
    const { result } = renderHook(() => EmptyRealmContext.useRealm(), { wrapper });
    await waitFor(() => expect(result.current).not.toBe(null));
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
              <RealmProvider>
                <View />
              </RealmProvider>
            </View>
          )}
          <Button testID="toggle" title="toggle" onPress={() => setToggleComponent(!toggleComponent)} />
        </>
      );
    };
    const { getByTestId } = render(<App />);
    const secondRealmProvider = getByTestId("secondRealmProvider");
    const toggleComponent = getByTestId("toggle");
    const actionComponent = await waitFor(() => getByTestId("action"));

    expect(secondRealmProvider).not.toBeEmptyElement();

    await act(async () => {
      fireEvent.press(toggleComponent);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(() => getByTestId("secondRealmProvider")).toThrow(
      "Unable to find an element with testID: secondRealmProvider",
    );

    // This is actually a bug that we need to fix on a deeper level
    await act(async () => {
      expect(() => fireEvent.press(actionComponent)).toThrow("Cannot access realm that has been closed.");
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
      fireEvent.press(changeSchemaButton);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // Changing the realm provider configuration will cause a comlete new remount
    // of the child component.  Therefore it must be retreived again
    const newSchemaNameContainer = getByTestId("schemaName");

    expect(newSchemaNameContainer).toHaveTextContent("cat");
  });
  it("can access realm through realmRef as a forwarded ref", async () => {
    const RealmComponent = () => {
      const realm = useRealm();
      return <Text testID="schemaName">{realm.schema[0].name}</Text>;
    };
    const App = () => {
      const realmRef = useRef<Realm | null>(null);
      const [path, setPath] = useState("");
      return (
        <>
          <View testID="firstRealmProvider">
            <RealmProvider realmRef={realmRef} schema={[dogSchema]} path="testPath.realm">
              <RealmComponent />
            </RealmProvider>
          </View>
          <Button
            testID="toggleRefPath"
            title="toggle ref path"
            onPress={() => setPath(realmRef?.current?.path ?? "")}
          />
          {realmRef.current && <Text testID="realmRefPath">{path}</Text>}
        </>
      );
    };
    const { getByTestId, queryByTestId } = render(<App />);
    await waitFor(() => getByTestId("schemaName"));
    const toggleRefPath = getByTestId("toggleRefPath");

    // Wait a tick for the RealmProvider to set the reference and then call a function that uses the ref
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      fireEvent.press(toggleRefPath);
    });

    const realmRefPathText = await waitFor(() => queryByTestId("realmRefPath"));

    expect(realmRefPathText).toHaveTextContent("testPath.realm");
  });
  // TODO: Now that local realm is immediately set, the fallback never renders.
  // We need to test synced realm in order to produce the fallback
  describe.skip("initially renders a fallback, until realm exists", () => {
    it("as a component", async () => {
      const App = () => {
        return (
          <RealmProvider fallback={() => <View testID="fallbackContainer" />}>
            <View testID="testContainer" />
          </RealmProvider>
        );
      };
      const { queryByTestId } = render(<App />);

      expect(queryByTestId("fallbackContainer")).not.toBeNull();
      expect(queryByTestId("testContainer")).toBeNull();

      await waitFor(() => queryByTestId("testContainer"));

      expect(queryByTestId("fallbackContainer")).toBeNull();
      expect(queryByTestId("testContainer")).not.toBeNull();
    });
    it("as an element", async () => {
      const Fallback = <View testID="fallbackContainer" />;
      const App = () => {
        return (
          <RealmProvider fallback={Fallback}>
            <View testID="testContainer" />
          </RealmProvider>
        );
      };
      const { queryByTestId } = render(<App />);

      expect(queryByTestId("fallbackContainer")).not.toBeNull();
      expect(queryByTestId("testContainer")).toBeNull();

      await waitFor(() => queryByTestId("testContainer"));

      expect(queryByTestId("fallbackContainer")).toBeNull();
      expect(queryByTestId("testContainer")).not.toBeNull();
    });
  });
});

describe("mergeRealmConfiguration", () => {
  it("merges two realm configurations", () => {
    const configA: Realm.Configuration = { schema: [catSchema], deleteRealmIfMigrationNeeded: true };
    const configB: Realm.Configuration = { sync: { user: {} as User, partitionValue: "someValue" } };

    const expectedResult = {
      schema: [catSchema],
      deleteRealmIfMigrationNeeded: true,
      sync: { user: {} as User, partitionValue: "someValue" },
    };

    const result = mergeRealmConfiguration(configA, configB);

    expect(result).toMatchObject(expectedResult);
  });
  it("merge updates to realm configuration", () => {
    let configA: Realm.Configuration = { schema: [catSchema], deleteRealmIfMigrationNeeded: true };
    let configB: Realm.Configuration = { schema: [dogSchema], deleteRealmIfMigrationNeeded: undefined };

    let expectedResult: Realm.Configuration = {
      schema: [dogSchema],
    };

    expect(mergeRealmConfiguration(configA, configB)).toMatchObject(expectedResult);
    configA = { schema: [catSchema], deleteRealmIfMigrationNeeded: true };
    configB = { schema: [catSchema, dogSchema], deleteRealmIfMigrationNeeded: false };

    expectedResult = {
      schema: [catSchema, dogSchema],
      deleteRealmIfMigrationNeeded: false,
    };

    expect(mergeRealmConfiguration(configA, configB)).toMatchObject(expectedResult);
  });
});

describe("areConfigurationsIdentical", () => {
  it("returns false if changes detected", () => {
    let configA: Realm.Configuration = { schema: [catSchema], deleteRealmIfMigrationNeeded: true };
    let configB: Realm.Configuration = { sync: { user: {} as User, partitionValue: "someValue" } };

    expect(areConfigurationsIdentical(configA, configB)).toBeFalsy();

    configA = {
      schema: [dogSchema, catSchema],
      sync: { user: {} as User, partitionValue: "otherValue" },
    };
    configB = {
      schema: [dogSchema, catSchema],
      sync: { user: {} as User, partitionValue: "someValue" },
    };

    expect(areConfigurationsIdentical(configA, configB)).toBeFalsy();
    configA = { schema: [catSchema], deleteRealmIfMigrationNeeded: true };
    configB = {
      schema: [dogSchema, catSchema],
      sync: { user: {} as User, partitionValue: "someValue" },
    };

    expect(areConfigurationsIdentical(configA, configB)).toBeFalsy();

    configA = { schema: [catSchema], deleteRealmIfMigrationNeeded: true, onMigration: () => undefined };
    configB = { schema: [catSchema], deleteRealmIfMigrationNeeded: true, onMigration: () => undefined };

    expect(areConfigurationsIdentical(configA, configB)).toBeFalsy();

    configA = { schema: [dogSchema, catSchema], deleteRealmIfMigrationNeeded: true };
    configB = { schema: [catSchema, dogSchema], deleteRealmIfMigrationNeeded: true };

    expect(areConfigurationsIdentical(configA, configB)).toBeFalsy();
  });

  it("returns true there are no changes ", () => {
    let configA: Realm.Configuration = { schema: [catSchema], deleteRealmIfMigrationNeeded: true };
    let configB: Realm.Configuration = { schema: [catSchema], deleteRealmIfMigrationNeeded: true };

    expect(areConfigurationsIdentical(configA, configB)).toBeTruthy();

    const onMigration = () => undefined;

    configA = { schema: [catSchema], deleteRealmIfMigrationNeeded: true, onMigration };
    configB = { schema: [catSchema], deleteRealmIfMigrationNeeded: true, onMigration };

    expect(areConfigurationsIdentical(configA, configB)).toBeTruthy();
  });
});
