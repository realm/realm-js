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

import React, { useEffect, useState } from "react";
import Realm from "realm";
import { render, waitFor, fireEvent, act } from "@testing-library/react-native";
import { View, TextInput, TouchableHighlight, Text, FlatList } from "react-native";
import { createRealmContext } from "..";
import "@testing-library/jest-native/extend-expect";
import { ReactTestInstance } from "react-test-renderer";

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

const { RealmProvider, useRealm, useQuery } = createRealmContext({
  schema: [ObjectSchema],
  inMemory: true,
  path: "object",
});

const renderCounter = jest.fn();

const App = () => {
  return (
    <RealmProvider>
      <SetupComponent>
        <View testID="testContainer">
          <TestComponent />
        </View>
      </SetupComponent>
    </RealmProvider>
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

const TestComponent = () => {
  const { data: collection, error } = useQuery<IObject>("Object");
  const realm = useRealm();

  if (error?.message) {
    console.error(error?.message);
    return null;
  }
  if (!collection) {
    return null;
  }

  return (
    <FlatList
      testID={"list"}
      data={collection}
      keyExtractor={(item) => `${item.id}`}
      renderItem={({ index, item }) => {
        renderCounter();
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
      }}
    />
  );
};

describe("useQuery", () => {
  beforeEach(() => {
    renderCounter.mockClear();
  });
  it("renders data in one render cycle per visible object in collection", async () => {
    const { getByTestId } = render(<App />);

    await waitFor(() => getByTestId("list"));

    expect(renderCounter).toHaveBeenCalledTimes(10);
  });
  it("change to data will rerender", async () => {
    const { getByTestId } = render(<App />);

    const element = await waitFor(() => getByTestId("result1"));
    const [nameElement, inputComponent] = element.children;

    expect(nameElement).toHaveTextContent("1");
    expect(renderCounter).toHaveBeenCalledTimes(10);

    await act(async () => {
      fireEvent.changeText(inputComponent as ReactTestInstance, "pencil");
    });

    expect(nameElement).toHaveTextContent("pencil");
    expect(renderCounter).toHaveBeenCalledTimes(20);
  });
});
