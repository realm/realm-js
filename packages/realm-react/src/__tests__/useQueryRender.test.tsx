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

class TestObject extends Realm.Object {
  id!: number;
  name!: string;

  static schema = {
    name: "TestObject",
    primaryKey: "id",
    properties: {
      id: "int",
      name: "string",
    },
  };
}

const testCollection = new Array(100).fill(undefined).map((_, index) => ({ id: index, name: `${index}` }));

const configuration: Realm.Configuration = {
  schema: [TestObject],
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

const App = ({ queryType = QueryType.normal }) => {
  return (
    <SetupComponent>
      <View testID="testContainer">
        <TestComponent queryType={queryType} />
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
      testCollection.forEach((object) => realm.create(TestObject, object));
    });
    setSetupComplete(true);
  }, [realm]);

  if (!setupComplete) {
    return null;
  }

  return children;
};

const Item: React.FC<{ item: TestObject & Realm.Object }> = React.memo(({ item }) => {
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

const FILTER_ARGS: [string] = ["id > 10"];
const SORTED_ARGS: [string, boolean] = ["id", true];

const TestComponent = ({ queryType }: { queryType: QueryType }) => {
  const collection = useQuery(TestObject);

  const result = useMemo(() => {
    switch (queryType) {
      case QueryType.filtered:
        return collection.filtered(...FILTER_ARGS);
      case QueryType.sorted:
        return collection.sorted(...SORTED_ARGS);
      case QueryType.normal:
        return collection;
    }
  }, [queryType, collection]);

  const renderItem = useCallback(({ item }) => <Item item={item} />, []);

  const keyExtractor = useCallback((item) => item.id, []);

  return <FlatList testID={"list"} data={result} keyExtractor={keyExtractor} renderItem={renderItem} />;
};

function getTestCollection(queryType: QueryType) {
  switch (queryType) {
    case QueryType.filtered:
      return testRealm.objects(TestObject).filtered(...FILTER_ARGS);
    case QueryType.sorted:
      return testRealm.objects(TestObject).sorted(...SORTED_ARGS);
    case QueryType.normal:
      return testRealm.objects(TestObject);
  }
}

describe.each`
  queryTypeName | queryType
  ${"normal"}   | ${QueryType.normal}
  ${"filtered"} | ${QueryType.filtered}
  ${"sorted"}   | ${QueryType.sorted}
`("useQueryRender: $queryTypeName", ({ queryType }) => {
  afterEach(() => {
    renderCounter.mockClear();
    Realm.clearTestState();
  });

  it("renders data in one render cycle per visible object in collection", async () => {
    const { getByTestId } = render(<App queryType={queryType} />);

    await waitFor(() => getByTestId("list"));

    expect(renderCounter).toHaveBeenCalledTimes(10);
  });
  it("change to data will rerender", async () => {
    const { getByTestId, getByText } = render(<App queryType={queryType} />);

    const collection = getTestCollection(queryType);
    const firstItem = collection[0];
    const id = firstItem.id;

    const nameElement = getByTestId(`name${id}`);
    const input = getByTestId(`input${id}`);

    expect(nameElement).toHaveTextContent(`${id}`);
    expect(renderCounter).toHaveBeenCalledTimes(10);

    fireEvent.changeText(input as ReactTestInstance, "apple");

    await waitFor(() => getByText("apple"));

    expect(nameElement).toHaveTextContent("apple");
    expect(renderCounter).toHaveBeenCalledTimes(11);
  });

  // TODO:  This is a known issue that we have to live with until it is possible
  // to retrieve the objectId from a deleted object in a listener callback
  it.skip("handles deletions", async () => {
    const { getByTestId } = render(<App queryType={queryType} />);

    const collection = getTestCollection(queryType);
    const firstItem = collection[0];
    const id = firstItem.id;

    const nextVisible = collection[10];

    const deleteButton = getByTestId(`deleteButton${id}`);
    const nameElement = getByTestId(`name${id}`);

    expect(nameElement).toHaveTextContent(`${id}`);
    expect(renderCounter).toHaveBeenCalledTimes(10);

    fireEvent.press(deleteButton as ReactTestInstance);

    await waitFor(() => getByTestId(`name${nextVisible.id}`));

    expect(renderCounter).toHaveBeenCalledTimes(11);
  });
  it("an implicit update to an item in the FlatList view area causes a rerender", async () => {
    const { getByTestId } = render(<App queryType={queryType} />);

    await waitFor(() => getByTestId("testContainer"));

    expect(renderCounter).toHaveBeenCalledTimes(10);

    const collection = getTestCollection(queryType);

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
    const { getByTestId } = render(<App queryType={queryType} />);

    await waitFor(() => getByTestId("testContainer"));

    expect(renderCounter).toHaveBeenCalledTimes(10);

    const collection = getTestCollection(queryType);

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
