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

const testCollection = new Array(100).fill(undefined).map((_, index) => ({ id: index, name: `${index}` }));

const configuration: Realm.Configuration = {
  schema: [ObjectSchema],
  inMemory: true,
  path: "testArtifacts/use-query-rerender.realm",
};

const renderCounter = jest.fn();

let testRealm: Realm = new Realm(configuration);

const useRealm = () => {
  testRealm = new Realm(configuration);
  const [realm] = useState(testRealm);

  useEffect(() => {
    return () => {
      realm.close();
    };
  }, [realm]);

  return realm;
};

const useQuery = createUseQuery(useRealm);

enum QueryType {
  filtered,
  sorted,
  normal,
}

const App = ({ type = QueryType.normal }) => {
  return (
    <SetupComponent>
      <View testID="testContainer">
        <TestComponent type={type} />
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

const TestComponent = ({ type }: { type: QueryType }) => {
  const collection = useQuery<IObject & Realm.Object>("Object");

  const result = useMemo(() => {
    switch (type) {
      case QueryType.filtered:
        return collection.filtered("id > 10");
      case QueryType.sorted:
        return collection.sorted("id", true);
      case QueryType.normal:
        return collection;
    }
  }, [type, collection]);

  const renderItem = useCallback(({ item }) => <Item item={item} />, []);

  const keyExtractor = useCallback((item) => item.id, []);

  return <FlatList testID={"list"} data={result} keyExtractor={keyExtractor} renderItem={renderItem} />;
};

describe("useQueryRender", () => {
  afterEach(() => {
    renderCounter.mockClear();
    Realm.clearTestState();
  });

  describe("normal collections", () => {
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
    it("an implicit update to an item in the FlatList view area causes a rerender", async () => {
      render(<App />);

      expect(renderCounter).toHaveBeenCalledTimes(10);

      const collection = testRealm.objects<IObject>("Object");

      testRealm.write(() => {
        collection[0].name = "apple";
      });

      // One could wait for "apple", but I want to mirror the underlying non-rerender test
      await act(async () => {
        // wait a bit to make sure there have been no changes
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      expect(renderCounter).toHaveBeenCalledTimes(11);
    });

    it("does not rerender if the update is out of the FlatList view area", async () => {
      render(<App />);

      expect(renderCounter).toHaveBeenCalledTimes(10);

      const collection = testRealm.objects<IObject>("Object");

      testRealm.write(() => {
        const lastIndex = collection.length - 1;
        collection[lastIndex].name = "apple";
      });

      await act(async () => {
        // wait a bit to make sure there have been no changes
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      expect(renderCounter).toHaveBeenCalledTimes(10);
    });
  });
  xdescribe("filtered collections", () => {
    it("an implicit update to an item in the FlatList view area causes a rerender", async () => {
      render(<App type={QueryType.filtered} />);

      expect(renderCounter).toHaveBeenCalledTimes(10);

      const collection = testRealm.objects<IObject>("Object").filtered("id > 10");

      testRealm.write(() => {
        collection[0].name = "apple";
      });

      // One could wait for "apple", but I want to mirror the underlying non-rerender test
      await act(async () => {
        // wait a bit to make sure there have been no changes
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      expect(renderCounter).toHaveBeenCalledTimes(11);
    });

    it("does not rerender if the update is out of the FlatList view area", async () => {
      render(<App type={QueryType.filtered} />);

      expect(renderCounter).toHaveBeenCalledTimes(10);

      const collection = testRealm.objects<IObject>("Object").filtered("id > 10");

      testRealm.write(() => {
        const lastIndex = collection.length - 1;
        collection[lastIndex].name = "apple";
      });

      await act(async () => {
        // wait a bit to make sure there have been no changes
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      expect(renderCounter).toHaveBeenCalledTimes(10);
    });
  });
  xdescribe("sorted collections", () => {
    it("an implicit update to an item in the FlatList view area causes a rerender", async () => {
      render(<App type={QueryType.sorted} />);

      expect(renderCounter).toHaveBeenCalledTimes(10);

      const collection = testRealm.objects<IObject>("Object").sorted("id", true);

      testRealm.write(() => {
        collection[0].name = "apple";
      });

      // One could wait for "apple", but I want to mirror the underlying non-rerender test
      await act(async () => {
        // wait a bit to make sure there have been no changes
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      expect(renderCounter).toHaveBeenCalledTimes(11);
    });

    it("does not rerender if the update is out of the FlatList view area", async () => {
      render(<App />);

      expect(renderCounter).toHaveBeenCalledTimes(10);

      const collection = testRealm.objects<IObject>("Object").sorted("id", true);

      testRealm.write(() => {
        const lastIndex = collection.length - 1;
        collection[lastIndex].name = "apple";
      });

      await act(async () => {
        // wait a bit to make sure there have been no changes
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      expect(renderCounter).toHaveBeenCalledTimes(10);
    });
  });
});
