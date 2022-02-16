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
import { act } from "react-test-renderer";
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

// TODO: It would be better not to have to rely on this, but at the moment I see no other alternatives
function forceSynchronousNotifications(realm: Realm) {
  // Starting a transaction will force all listeners to advance to the latest version
  // and deliver notifications. We don't need to commit the transaction for this to work.
  realm.beginTransaction();
  realm.cancelTransaction();
}

const itemRenderCounter = jest.fn();

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
      realm.create(List, { id: 1, title: "List", items: testCollection });
    });
    setSetupComplete(true);
  }, [realm]);

  if (!setupComplete) {
    return null;
  }

  return children;
};

const Item: React.FC<{ item: ListItem & Realm.Object }> = React.memo(({ item }) => {
  itemRenderCounter();
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
      <FlatList testID="list" data={list?.items ?? []} keyExtractor={keyExtractor} renderItem={renderItem} />;
      {list?.favoriteItem && (
        <View testID={`favoriteItem-${list?.favoriteItem.name}`}>
          <Text>{list?.favoriteItem.name}</Text>
        </View>
      )}
    </>
  );
};

async function setupTest() {
  const { getByTestId, getByText, debug } = render(<App />);
  await waitFor(() => getByTestId("testContainer"));

  const object = testRealm.objectForPrimaryKey(List, 1);
  if (!object) throw new Error("Object not found in Realm");
  const collection = object.items;

  expect(itemRenderCounter).toHaveBeenCalledTimes(10);

  return { getByTestId, getByText, debug, object, collection };
}

describe("useObject: rendering objects with a Realm.List property", () => {
  afterEach(() => {
    itemRenderCounter.mockClear();
    Realm.clearTestState();
  });
  afterAll(() => {
    testRealm.close();
  });

  it("renders each visible item in the list once", async () => {
    const { getByTestId } = render(<App />);

    await waitFor(() => getByTestId("list"));

    expect(itemRenderCounter).toHaveBeenCalledTimes(10);
  });

  it("only re-renders the changed item when a list item's data changes", async () => {
    const { getByTestId, getByText, collection } = await setupTest();

    const id = collection[0].id;

    const nameElement = getByTestId(`name${id}`);
    const input = getByTestId(`input${id}`);

    expect(nameElement).toHaveTextContent(`${id}`);

    fireEvent.changeText(input, "apple");

    await waitFor(() => getByText("apple"));

    expect(nameElement).toHaveTextContent("apple");
    expect(itemRenderCounter).toHaveBeenCalledTimes(11);
  });

  // This is a restriction of the current implementation as we do not know the
  // id of a deleted item, ideally this would only re-render once
  it("re-renders every visible item in the list when an item is deleted", async () => {
    const { getByTestId, collection } = await setupTest();

    const firstItem = collection[0];
    const id = firstItem.id;

    const nextVisible = collection[10];

    const deleteButton = getByTestId(`deleteButton${id}`);
    const nameElement = getByTestId(`name${id}`);

    expect(nameElement).toHaveTextContent(`${id}`);
    expect(itemRenderCounter).toHaveBeenCalledTimes(10);

    fireEvent.press(deleteButton);

    await waitFor(() => getByTestId(`name${nextVisible.id}`));

    expect(itemRenderCounter).toHaveBeenCalledTimes(20);
  });

  it("only re-renders the changed item when a visible list item is modified without a UI interaction", async () => {
    const { collection } = await setupTest();
    testRealm.write(() => {
      collection[0].name = "apple";
    });

    // Force Realm listeners to fire rather than waiting for the text "apple"
    // to appear, in order to match how the subsequent "does not re-render"
    // test works.
    await act(async () => {
      forceSynchronousNotifications(testRealm);
    });

    expect(itemRenderCounter).toHaveBeenCalledTimes(11);
  });

  it("only renders the new item when a list item is added", async () => {
    const { collection, debug } = await setupTest();
    testRealm.write(() => {
      collection.unshift(testRealm.create(ListItem, { id: 9999, name: "apple" }));
    });

    // Force Realm listeners to fire rather than waiting for the text "apple"
    // to appear, in order to match how the subsequent "does not re-render"
    // test works.
    await act(async () => {
      forceSynchronousNotifications(testRealm);
    });

    debug();

    expect(itemRenderCounter).toHaveBeenCalledTimes(11);
  });

  it("does not re-render if an invisible list item is modified without a UI interaction", async () => {
    const { collection } = await setupTest();

    testRealm.write(() => {
      const lastIndex = collection.length - 1;
      collection[lastIndex].name = "apple";
    });

    await act(async () => {
      forceSynchronousNotifications(testRealm);
    });

    expect(itemRenderCounter).toHaveBeenCalledTimes(10);
  });

  it("test favorite object", async () => {
    const { getByTestId } = await setupTest();
    const object = testRealm.objectForPrimaryKey(List, 1);
    if (!object) throw new Error("Object not found in Realm");

    await act(async () => {
      testRealm.write(() => {
        object.favoriteItem = object.items[0];
      });
    });

    expect(getByTestId(`favoriteItem-${object.items[0].name}`)).toBeTruthy();

    await act(async () => {
      testRealm.write(() => {
        object.favoriteItem = object.items[1];
      });
    });

    expect(getByTestId(`favoriteItem-${object.items[1].name}`)).toBeTruthy();

    await act(async () => {
      testRealm.write(() => {
        object.items[1].name = "apple";
      });
    });

    expect(getByTestId(`favoriteItem-${object.items[1].name}`)).toBeTruthy();

    // We should only have re-rendered once, as only the last change actually modified an item
    expect(itemRenderCounter).toHaveBeenCalledTimes(11);
  });
});
