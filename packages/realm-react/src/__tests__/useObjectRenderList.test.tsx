////////////////////////////////////////////////////////////////////////////
//
// Copyright 2022 Realm Inc.
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

import { fireEvent, render, waitFor } from "@testing-library/react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { TextInput, Text, TouchableHighlight, View, FlatList } from "react-native";
import { act, ReactTestInstance } from "react-test-renderer";
import Realm from "realm";
import { createUseObject } from "../useObject";

export class ListItem extends Realm.Object {
  id!: number;
  name!: string;
  lists!: Realm.List<List>;

  static schema: Realm.ObjectSchema = {
    name: "ListItem",
    properties: {
      id: "int",
      name: "string",
      lists: {
        type: "linkingObjects",
        objectType: "List",
        property: "items",
      },
    },
    primaryKey: "id",
  };
}

export class List extends Realm.Object {
  id!: number;
  title!: string;
  items!: Realm.List<ListItem>;
  favoriteItem?: ListItem;

  static schema: Realm.ObjectSchema = {
    name: "List",
    properties: {
      id: "int",
      title: "string",
      items: "ListItem[]",
      favoriteItem: "ListItem",
    },
    primaryKey: "id",
  };
}

const configuration: Realm.Configuration = {
  schema: [List, ListItem],
  deleteRealmIfMigrationNeeded: true,
  path: "testArtifacts/use-object-render-list.realm",
};

//TODO: It would be better not to have to rely on this, but at the moment I see no other alternatives
function forceSynchronousNotifications(realm: Realm) {
  // Starting a transaction will force all listeners to advance to the latest version
  // and deliver notifications. We don't need to commit the transaction for this to work.
  realm.beginTransaction();
  realm.cancelTransaction();
}

const renderCounter = jest.fn();

let testRealm: Realm = new Realm(configuration);

const testCollection = new Array(20).fill(undefined).map((_, index) => ({ id: index, name: `${index}` }));

const useRealm = () => {
  testRealm = new Realm(configuration);
  const realm = useRef(testRealm);

  return realm.current;
};

const useObject = createUseObject(useRealm);

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

  useEffect(() => {
    return () => {
      realm.close();
    };
  }, [realm]);

  const [setupComplete, setSetupComplete] = useState(false);
  useEffect(() => {
    realm.write(() => {
      realm.deleteAll();
      const items = testCollection.map((object) => realm.create(ListItem, object));
      const list = realm.create(List, { id: 1, title: "List", items: items });
      //testCollection.forEach((object) => list.items.push(realm.create(ListItem, object)));
    });
    setSetupComplete(true);
  }, [realm]);

  if (!setupComplete) {
    return null;
  }

  return children;
};

const Item: React.FC<{ item: ListItem & Realm.Object }> = React.memo(({ item }) => {
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
  const list = useObject(List, 1);

  const renderItem = useCallback(({ item }) => <Item item={item} />, []);

  const keyExtractor = useCallback((item) => item.id, []);

  return (
    <>
      <FlatList testID={"list"} data={list?.items ?? []} keyExtractor={keyExtractor} renderItem={renderItem} />;
      {list?.favoriteItem && (
        <View testID={`favoriteItem-${list?.favoriteItem.name}`}>
          <Text>{list?.favoriteItem.name}</Text>
        </View>
      )}
    </>
  );
};

describe("useObjectRenderList: list property", () => {
  afterEach(() => {
    renderCounter.mockClear();
    Realm.clearTestState();
  });
  afterAll(() => {
    testRealm.close();
  });

  it("renders data in one render cycle per visible object in collection", async () => {
    const { getByTestId } = render(<App />);

    await waitFor(() => getByTestId("list"));

    expect(renderCounter).toHaveBeenCalledTimes(10);
  });
  it("change to data will rerender", async () => {
    const { getByTestId, getByText } = render(<App />);

    const collection = testRealm.objectForPrimaryKey(List, 1)?.items ?? [];
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

  it("handles deletions", async () => {
    const { getByTestId } = render(<App />);

    const object = testRealm.objectForPrimaryKey(List, 1);
    const collection = object?.items ?? [];
    const firstItem = collection[0];
    const id = firstItem.id;

    const nextVisible = collection[10];

    const deleteButton = getByTestId(`deleteButton${id}`);
    const nameElement = getByTestId(`name${id}`);

    expect(nameElement).toHaveTextContent(`${id}`);
    expect(renderCounter).toHaveBeenCalledTimes(10);

    fireEvent.press(deleteButton as ReactTestInstance);

    await waitFor(() => getByTestId(`name${nextVisible.id}`));

    expect(renderCounter).toHaveBeenCalledTimes(20);
  });
  it("an implicit update to an item in the FlatList view area causes a rerender", async () => {
    const { getByTestId } = render(<App />);

    await waitFor(() => getByTestId("testContainer"));

    expect(renderCounter).toHaveBeenCalledTimes(10);

    const collection = testRealm.objectForPrimaryKey(List, 1)?.items ?? [];

    testRealm.write(() => {
      collection[0].name = "apple";
    });

    // // One could wait for "apple", but I want to mirror the underlying non-rerender test
    await act(async () => {
      forceSynchronousNotifications(testRealm);
    });

    expect(renderCounter).toHaveBeenCalledTimes(11);
  });

  it("does not rerender if the update is out of the FlatList view area", async () => {
    const { getByTestId } = render(<App />);

    await waitFor(() => getByTestId("testContainer"));

    expect(renderCounter).toHaveBeenCalledTimes(10);

    const collection = testRealm.objectForPrimaryKey(List, 1)?.items ?? [];

    testRealm.write(() => {
      const lastIndex = collection.length - 1;
      collection[lastIndex].name = "apple";
    });

    await act(async () => {
      forceSynchronousNotifications(testRealm);
    });

    expect(renderCounter).toHaveBeenCalledTimes(10);
  });
  it("test favorite object", async () => {
    const { getByTestId } = render(<App />);

    await waitFor(() => getByTestId("testContainer"));

    expect(renderCounter).toHaveBeenCalledTimes(10);

    const collection = testRealm.objectForPrimaryKey(List, 1)!;

    await act(async () => {
      testRealm.write(() => {
        collection.favoriteItem = collection.items[0];
      });
    });

    expect(getByTestId(`favoriteItem-${collection?.items[0].name}`)).toBeTruthy();

    await act(async () => {
      testRealm.write(() => {
        if (collection) {
          collection.favoriteItem = collection.items[1];
        }
      });
    });

    expect(getByTestId(`favoriteItem-${collection?.items[1].name}`)).toBeTruthy();

    await act(async () => {
      testRealm.write(() => {
        if (collection) {
          collection.items[1].name = "tom";
        }
      });
    });

    expect(getByTestId(`favoriteItem-${collection?.items[1].name}`)).toBeTruthy();

    expect(renderCounter).toHaveBeenCalledTimes(11);
  });
});
