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
import { Button, Text, View } from "react-native";
import { act, fireEvent, render, renderHook, waitFor } from "@testing-library/react-native";

import { RealmProvider, createRealmContext } from "..";
import {
  RealmProviderFallback,
  RealmProviderFromRealm,
  areConfigurationsIdentical,
  mergeRealmConfiguration,
} from "../RealmProvider";
import { randomRealmPath } from "./helpers";
import { RealmContext } from "../RealmContext";
import { mockRealmOpen } from "./mocks";

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

const withConfigRealmContext = createRealmContext({
  schema: [dogSchema],
  inMemory: true,
  path: randomRealmPath(),
});

describe("RealmProvider", () => {
  afterEach(() => {
    Realm.clearTestState();
  });

  describe("with a Realm Configuration", () => {
    const { RealmProvider, useRealm } = withConfigRealmContext;

    it("returns the configured realm with useRealm", async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => <RealmProvider>{children}</RealmProvider>;
      const { result } = renderHook(() => useRealm(), { wrapper });
      await waitFor(() => expect(result.current).not.toBe(null));
      const realm = result.current;
      expect(realm).toBeInstanceOf(Realm);
      expect(realm.schema[0].name).toBe("dog");
    });

    it("closes realm on unmount by default", async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => <RealmProvider>{children}</RealmProvider>;
      const { result, unmount } = renderHook(() => useRealm(), { wrapper });
      await waitFor(() => expect(result.current).not.toBe(null));
      const realm = result.current;
      unmount();
      expect(realm.isClosed).toBe(true);
    });

    it("does not close realm on unmount if closeOnUnmount is false", async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <RealmProvider closeOnUnmount={false}>{children}</RealmProvider>
      );
      const { result, unmount } = renderHook(() => useRealm(), { wrapper });
      await waitFor(() => expect(result.current).not.toBe(null));
      const realm = result.current;
      unmount();
      expect(realm.isClosed).toBe(false);
    });

    it("will override the configuration provided in createRealmContext", async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <RealmProvider schema={[catSchema]}>{children}</RealmProvider>
      );
      const { result } = renderHook(() => useRealm(), { wrapper });
      await waitFor(() => expect(result.current).not.toBe(null));
      const realm = result.current;
      expect(realm).toBeInstanceOf(Realm);
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
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      });
      expect(() => getByTestId("secondRealmProvider")).toThrow(
        "Unable to find an element with testID: secondRealmProvider",
      );

      // This is actually a bug that we need to fix on a deeper level
      await act(async () => {
        expect(() => fireEvent.press(actionComponent)).toThrow("Cannot access realm that has been closed.");
      });
    });

    it("handles state changes to its configuration", async () => {
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
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
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
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        fireEvent.press(toggleRefPath);
      });

      const realmRefPathText = await waitFor(() => queryByTestId("realmRefPath"));

      expect(realmRefPathText).toHaveTextContent("testPath.realm", { exact: false });
    });

    // TODO: Now that local realm is immediately set, the fallback never renders.
    // We need to test synced realm in order to produce the fallback
    describe("initially renders a fallback, until realm exists", () => {
      afterEach(() => {
        jest.clearAllMocks();
      });

      it("as a component", async () => {
        const slowRealmOpen = mockRealmOpen();
        const App = () => {
          return (
            <RealmProvider sync={{}} fallback={() => <View testID="fallbackContainer" />}>
              <View testID="testContainer" />
            </RealmProvider>
          );
        };
        const { queryByTestId } = render(<App />);

        expect(queryByTestId("fallbackContainer")).not.toBeNull();
        expect(queryByTestId("testContainer")).toBeNull();

        await act(async () => await slowRealmOpen);

        expect(queryByTestId("fallbackContainer")).toBeNull();
        expect(queryByTestId("testContainer")).not.toBeNull();
      });

      it("as an element", async () => {
        const slowRealmOpen = mockRealmOpen();

        const Fallback = <View testID="fallbackContainer" />;
        const App = () => {
          return (
            <RealmProvider sync={{}} fallback={Fallback}>
              <View testID="testContainer" />
            </RealmProvider>
          );
        };
        const { queryByTestId } = render(<App />);

        expect(queryByTestId("fallbackContainer")).not.toBeNull();
        expect(queryByTestId("testContainer")).toBeNull();

        await act(async () => await slowRealmOpen);

        expect(queryByTestId("fallbackContainer")).toBeNull();
        expect(queryByTestId("testContainer")).not.toBeNull();
      });

      it("should receive progress information", async () => {
        const expectedProgressValues = [0, 0.25, 0.5, 0.75, 1];
        const slowRealmOpen = mockRealmOpen({ progressValues: expectedProgressValues });
        const renderedProgressValues: (number | null)[] = [];

        const Fallback: RealmProviderFallback = ({ progress }) => {
          renderedProgressValues.push(progress);
          return <View testID="fallbackContainer">{progress}</View>;
        };
        const App = () => {
          return (
            <RealmProvider sync={{}} fallback={Fallback}>
              <View testID="testContainer" />
            </RealmProvider>
          );
        };
        const { queryByTestId } = render(<App />);

        expect(queryByTestId("fallbackContainer")).not.toBeNull();
        expect(queryByTestId("testContainer")).toBeNull();
        expect(renderedProgressValues).toStrictEqual([null, expectedProgressValues[0]]);

        await act(async () => await slowRealmOpen);

        expect(queryByTestId("fallbackContainer")).toBeNull();
        expect(queryByTestId("testContainer")).not.toBeNull();

        expect(renderedProgressValues).toStrictEqual([null, ...expectedProgressValues]);
      });
    });
  });

  describe("with an existing Realm instance", () => {
    let existingRealmInstance: Realm;
    let realmContextWithRealmInstance: RealmContext<RealmProviderFromRealm>;

    beforeEach(() => {
      existingRealmInstance = new Realm({
        schema: [dogSchema],
        inMemory: true,
        path: randomRealmPath(),
      });

      realmContextWithRealmInstance = createRealmContext(existingRealmInstance);
    });

    it("returns the given realm with useRealm", async () => {
      const { RealmProvider, useRealm } = realmContextWithRealmInstance;

      const wrapper = ({ children }: { children: React.ReactNode }) => <RealmProvider>{children}</RealmProvider>;
      const { result } = renderHook(() => useRealm(), { wrapper });
      await waitFor(() => expect(result.current).not.toBe(null));
      const realm = result.current;

      expect(realm).toStrictEqual(existingRealmInstance);
    });

    it("does not need a RealmProvider to be wrapped", async () => {
      const { useRealm } = realmContextWithRealmInstance;

      const wrapper = ({ children }: { children: React.ReactNode }) => <>{children}</>;
      const { result } = renderHook(() => useRealm(), { wrapper });
      await waitFor(() => expect(result.current).not.toBe(null));
      const realm = result.current;

      expect(realm).toStrictEqual(existingRealmInstance);
    });

    it("does not close realm on unmount by default", async () => {
      const { RealmProvider, useRealm } = realmContextWithRealmInstance;

      const wrapper = ({ children }: { children: React.ReactNode }) => <RealmProvider>{children}</RealmProvider>;
      const { result, unmount } = renderHook(() => useRealm(), { wrapper });
      await waitFor(() => expect(result.current).not.toBe(null));
      const realm = result.current;
      unmount();
      expect(realm.isClosed).toBe(false);
      expect(existingRealmInstance.isClosed).toBe(false);
    });
  });

  describe("with an initially empty context", () => {
    const emptyRealmContext = createRealmContext();

    it("should use Realm instance if realm prop is passed", () => {
      const existingRealm = new Realm({
        schema: [dogSchema],
        inMemory: true,
        path: randomRealmPath(),
      });
      const { RealmProvider, useRealm } = emptyRealmContext;

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <RealmProvider realm={existingRealm}>{children}</RealmProvider>
      );
      const { result, unmount } = renderHook(() => useRealm(), { wrapper });

      expect(result.current.isClosed).toBe(false);
      expect(result.current).toStrictEqual(existingRealm);

      unmount();
      // Closing a realm should not be managed by the provider if an existing instance was given
      expect(result.current.isClosed).toBe(false);
    });

    it("should use Realm configuration if any config props are passed", () => {
      const { RealmProvider, useRealm } = emptyRealmContext;

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <RealmProvider schema={[dogSchema]}>{children}</RealmProvider>
      );
      const { result, unmount } = renderHook(() => useRealm(), { wrapper });

      expect(result.current.schema.length).toEqual(1);
      expect(result.current.schema[0].name).toEqual(dogSchema.name);

      expect(result.current.isClosed).toBe(false);
      unmount();
      // Closing a realm should be managed by the provider by default if an existing instance was given
      expect(result.current.isClosed).toBe(true);
    });

    it("should use an empty Realm configuration by default if no props are passed", () => {
      const { RealmProvider, useRealm } = emptyRealmContext;

      const wrapper = ({ children }: { children: React.ReactNode }) => <RealmProvider>{children}</RealmProvider>;
      const { result, unmount } = renderHook(() => useRealm(), { wrapper });

      expect(result.current.schema.length).toEqual(0);

      expect(result.current.isClosed).toBe(false);
      unmount();
      // Closing a realm should be managed by the provider by default if an existing instance was given
      expect(result.current.isClosed).toBe(true);
    });

    it("throws an error when both realm and configuration props are provided", () => {
      expect(() =>
        render(
          // @ts-expect-error The realm and configuration props should be mutually exclusive
          <RealmProvider realm={new Realm()} schema={[]}>
            ...
          </RealmProvider>,
        ),
      ).toThrow("Cannot use configuration props when using an existing Realm instance.");
    });
  });

  describe("with multiple providers", () => {
    const createRealmObjectCreator =
      (realmContext: RealmContext<unknown>) =>
      ({ testID }: { testID: string }) => {
        const { useRealm } = realmContext;
        const realm = useRealm();
        return (
          <Button
            testID={testID}
            title="toggle"
            onPress={() =>
              realm.write(() => {
                realm.create("dog", { _id: new Date().getTime(), name: "Rex" });
              })
            }
          />
        );
      };

    const WithConfig = withConfigRealmContext;

    it("can have multiple providers with config and with realm", async () => {
      const existingRealmInstance = new Realm({
        schema: [dogSchema],
        inMemory: true,
        path: randomRealmPath(),
      });

      const WithRealmInstance = createRealmContext(existingRealmInstance);
      const WithConfigObjectCreator = createRealmObjectCreator(WithConfig);
      const WithConfigProviderComponent = ({ children }: { children?: React.ReactNode }) => (
        <View testID="firstRealmProvider">
          <WithConfig.RealmProvider>
            {children}
            <WithConfigObjectCreator testID="with-config-action" />
          </WithConfig.RealmProvider>
        </View>
      );
      const { result: withConfigResult } = renderHook(() => WithConfig.useRealm(), {
        wrapper: WithConfigProviderComponent,
      });
      const withConfigRealm = withConfigResult.current;

      const WithRealmObjectCreator = createRealmObjectCreator(WithRealmInstance);
      const WithRealmInstanceProviderComponent = ({ children }: { children?: React.ReactNode }) => (
        <View testID="secondRealmProvider">
          <WithRealmInstance.RealmProvider>
            {children}
            <WithRealmObjectCreator testID="with-realm-action" />
          </WithRealmInstance.RealmProvider>
        </View>
      );
      const { result: withRealmInstanceResult } = renderHook(() => WithRealmInstance.useRealm(), {
        wrapper: WithRealmInstanceProviderComponent,
      });
      const withRealmInstanceRealm = withRealmInstanceResult.current;

      expect(withRealmInstanceRealm.path).not.toEqual(withConfigRealm.path);

      expect(withRealmInstanceRealm.objects(dogSchema.name).length).toEqual(0);
      expect(existingRealmInstance.objects(dogSchema.name).length).toEqual(0);
      expect(withConfigRealm.objects(dogSchema.name).length).toEqual(0);

      const pressButton = async (testId: string) => {
        const toggleComponent = getByTestId(testId);
        await act(async () => {
          fireEvent.press(toggleComponent);
          await new Promise<void>((resolve) => setTimeout(resolve, 0));
        });
      };

      const App = () => {
        const [toggleComponent, setToggleComponent] = useState(true);
        return (
          <>
            <WithConfigProviderComponent />
            {toggleComponent && <WithRealmInstanceProviderComponent />}
            <Button testID="toggle" title="toggle" onPress={() => setToggleComponent(!toggleComponent)} />
          </>
        );
      };

      const { getByTestId } = render(<App />);

      const secondRealmProvider = getByTestId("secondRealmProvider");

      expect(secondRealmProvider).not.toBeEmptyElement();

      await act(async () => {
        // Create a new Realm object using the existing Realm instance provider.
        await pressButton("with-realm-action");
        expect(existingRealmInstance.objects(dogSchema.name).length).toEqual(1);
        expect(withRealmInstanceRealm.objects(dogSchema.name).length).toEqual(1);
        expect(withRealmInstanceRealm.objects(dogSchema.name)[0]).toStrictEqual(
          existingRealmInstance.objects(dogSchema.name)[0],
        );

        expect(withConfigRealm.objects(dogSchema.name).length).toEqual(0);

        // Create a new Realm object using the Realm config provider.
        await pressButton("with-config-action");
        expect(withConfigRealm.objects(dogSchema.name).length).toEqual(1);
        expect(existingRealmInstance.objects(dogSchema.name).length).toEqual(1);
        expect(withRealmInstanceRealm.objects(dogSchema.name).length).toEqual(1);
      });
    });

    it("can have nested generalized providers with config and with realm", async () => {
      const { RealmProvider, useRealm } = createRealmContext();

      const customRealm = new Realm({ schema: [dogSchema], inMemory: true, path: randomRealmPath() });

      const InstanceFirstWrapper = ({ children }: React.PropsWithChildren) => {
        return (
          <RealmProvider schema={[catSchema]} inMemory={true}>
            <RealmProvider realm={customRealm}>{children}</RealmProvider>
          </RealmProvider>
        );
      };

      const { result: instanceResult } = renderHook(() => useRealm(), { wrapper: InstanceFirstWrapper });

      expect(instanceResult.current).toStrictEqual(customRealm);

      const ConfigFirstWrapper = ({ children }: React.PropsWithChildren) => {
        return (
          <>
            <RealmProvider realm={customRealm}>
              <RealmProvider schema={[catSchema]} inMemory={true}>
                {children}
              </RealmProvider>
            </RealmProvider>
          </>
        );
      };
      const { result: configFirstResult } = renderHook(() => useRealm(), { wrapper: ConfigFirstWrapper });

      expect(configFirstResult.current).not.toStrictEqual(customRealm);
      expect(configFirstResult.current.schema.length).toEqual(1);
      expect(configFirstResult.current.schema[0].name).toEqual(catSchema.name);
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
});
