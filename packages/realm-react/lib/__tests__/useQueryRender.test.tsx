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

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Realm from "realm";
import { render, waitFor, fireEvent, act } from "@testing-library/react-native";
import { View, TextInput, TouchableHighlight, Text, FlatList } from "react-native";
import "@testing-library/jest-native/extend-expect";
import { ReactTestInstance } from "react-test-renderer";
import { createUseQuery } from "../useQuery";

const ObjectSchema: Realm.ObjectSchema = {
  name: "Object",
  primaryKey: "id",
  properties: {
    id: "int",
    name: "string",
  },
};

interface IObject {
  id: number;
  name: string;
}

const testCollection = new Array(1000).fill(undefined).map((_, index) => ({ id: index, name: `${index}` }));

const configuration: Realm.Configuration = {
  schema: [ObjectSchema],
  inMemory: true,
  path: "testArtifacts/useQueryRender",
};

const renderCounter = jest.fn();

const useRealm = () => {
  const realm = useMemo(() => new Realm(configuration), [configuration]);

  useEffect(() => {
    return () => {
      realm.close();
    };
  }, [realm]);

  return realm;
};

const useQuery = createUseQuery(useRealm);

const App = () => {
  return (
    <SetupComponent>
      <View testID="testContainer">
        <TestComponent />
      </View>
    </SetupComponent>
  );
};

const SetupComponent = ({ children }: { children: JSX.Element }): JSX.Element | null => {
  const realm = useRealm();
  const [setupComplete, setSetupComplete] = useState(false);
  useEffect(() => {
    realm.write(() => {
      realm.deleteAll();
      testCollection.forEach((object) => realm.create("Object", object));
    });
    setSetupComplete(true);
  }, [realm]);

  if (!setupComplete) {
    return null;
  }

  return children;
};

const Item: React.FC<{ index: number; item: IObject & Realm.Object }> = ({ index, item }) => {
  renderCounter();
  const realm = useRealm();
  return (
    <View testID={`result${index}`}>
      <View testID={`name${index}`}>{item.name}</View>
      <TextInput
        testID={`inputComponent${index}`}
        value={item.name}
        onChangeText={(text) => {
          realm.write(() => {
            item.name = text;
          });
        }}
      ></TextInput>
      <TouchableHighlight
        testID={`deleteButton${index}`}
        onPress={() => {
          realm.write(() => {
            realm.delete(item);
          });
        }}
      >
        <Text>Delete</Text>
      </TouchableHighlight>
    </View>
  );
};

const TestComponent = () => {
  const collection = useQuery<IObject>("Object");

  if (!collection) {
    return null;
  }
  const renderItem = useCallback(({ index, item }) => <Item index={index} item={item} />, []);

  const keyExtractor = useCallback((item) => item.id, []);

  return <FlatList testID={"list"} data={collection} keyExtractor={keyExtractor} renderItem={renderItem} />;
};

describe("useQuery", () => {
  afterEach(() => {
    renderCounter.mockClear();
    Realm.clearTestState();
  });
  it("renders data in one render cycle per visible object in collection", async () => {
    const { getByTestId } = render(<App />);

    await waitFor(() => getByTestId("list"));

    expect(renderCounter).toHaveBeenCalledTimes(10);
  });
  it("change to data will rerender", async () => {
    const { getByTestId } = render(<App />);

    const element = getByTestId("result1");
    const [nameElement, inputComponent] = element.children;

    expect(nameElement).toHaveTextContent("1");
    expect(renderCounter).toHaveBeenCalledTimes(10);

    await act(async () => fireEvent.changeText(inputComponent as ReactTestInstance, "pencil"));

    expect(nameElement).toHaveTextContent("pencil");
    expect(renderCounter).toHaveBeenCalledTimes(20);
  });

  it("handles deletions", async () => {
    const { getByTestId } = render(<App />);

    const element = getByTestId("result1");
    const [nameElement, , deletionComponent] = element.children;

    expect(nameElement).toHaveTextContent("1");
    expect(renderCounter).toHaveBeenCalledTimes(10);

    await act(async () => fireEvent.press(deletionComponent as ReactTestInstance));

    expect(renderCounter).toHaveBeenCalledTimes(20);
  });
});
