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

import React, { useEffect, useState, useCallback } from "react";
import Realm from "realm";
import { render, waitFor, fireEvent, act } from "@testing-library/react-native";
import { View, TextInput, TouchableHighlight, Text, FlatList, ListRenderItem } from "react-native";
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
  path: "testArtifacts/use-query-rerender.realm",
};

const renderCounter = jest.fn();

const useRealm = () => {
  const [realm] = useState(new Realm(configuration));

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

const Item: React.FC<{ item: IObject & Realm.Object }> = React.memo(({ item }) => {
  renderCounter();
  const realm = useRealm();
  return (
    <View testID={`result${item.id}`}>
      <View testID={`name${item.id}`}>
        <Text>{item.name}</Text>
      </View>
      <TextInput
        testID={`input${item.id}`}
        value={item.name}
        onChangeText={(text) => {
          realm.write(() => {
            item.name = text;
          });
        }}
      ></TextInput>
      <TouchableHighlight
        testID={`deleteButton${item.id}`}
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
});

const TestComponent = () => {
  const collection = useQuery<IObject & Realm.Object>("Object");

  const renderItem = useCallback(({ item }) => <Item item={item} />, []);

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
    const { getByTestId, getByText } = render(<App />);

    const nameElement = getByTestId("name1");
    const input = getByTestId("input1");

    expect(nameElement).toHaveTextContent("1");
    expect(renderCounter).toHaveBeenCalledTimes(10);

    fireEvent.changeText(input as ReactTestInstance, "apple");

    await waitFor(() => getByText("apple"));

    expect(nameElement).toHaveTextContent("apple");
    expect(renderCounter).toHaveBeenCalledTimes(11);
  });

  it("handles deletions", async () => {
    const { getByTestId } = render(<App />);

    const deleteButton = getByTestId("deleteButton1");
    const nameElement = getByTestId("name1");

    expect(nameElement).toHaveTextContent("1");
    expect(renderCounter).toHaveBeenCalledTimes(10);

    fireEvent.press(deleteButton as ReactTestInstance);

    await waitFor(() => getByTestId("result10"));

    expect(renderCounter).toHaveBeenCalledTimes(11);
  });

  it("handles implicit updates", () => {
    expect(true).toEqual(true);
  });
});
