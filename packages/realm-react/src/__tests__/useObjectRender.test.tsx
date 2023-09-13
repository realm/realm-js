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

import { fireEvent, render, waitFor, act } from "@testing-library/react-native";
import React, { useEffect, useRef, useState } from "react";
import { TextInput, Text, TouchableHighlight, View, FlatList, ListRenderItem } from "react-native";
import Realm from "realm";
import { createUseObject } from "../useObject";

export class ListItem extends Realm.Object {
  id!: Realm.BSON.ObjectId;
  name!: string;
  lists!: Realm.List<List>;

  static schema: Realm.ObjectSchema = {
    name: "ListItem",
    properties: {
      id: "objectId",
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
  id!: Realm.BSON.ObjectId;
  title!: string;
  items!: Realm.List<ListItem>;
  favoriteItem?: ListItem;
  tags!: Realm.List<string>;

  static schema: Realm.ObjectSchema = {
    name: "List",
    properties: {
      id: "objectId",
      title: "string",
      items: "ListItem[]",
      favoriteItem: "ListItem",
      tags: "string[]",
    },
    primaryKey: "id",
  };
}

const configuration: Realm.Configuration = {
  schema: [List, ListItem],
  deleteRealmIfMigrationNeeded: true,
  path: "testArtifacts/use-object-render.realm",
};

// TODO: It would be better not to have to rely on this, but at the moment I see no other alternatives
function forceSynchronousNotifications(realm: Realm) {
  // Starting a transaction will force all listeners to advance to the latest version
  // and deliver notifications. We don't need to commit the transaction for this to work.
  realm.beginTransaction();
  realm.cancelTransaction();
}

const itemRenderCounter = jest.fn();
const listRenderCounter = jest.fn();
const objectChangeCounter = jest.fn();
const listChangeCounter = jest.fn();

const testRealm: Realm = new Realm(configuration);

const testCollection = [...new Array(100)].map(() => {
  const id = new Realm.BSON.ObjectId();
  return { id, name: id.toHexString() };
});

const useRealm = () => {
  return testRealm;
};

const useObject = createUseObject(useRealm);

// setting renderItems to false will invoke `useObject` but not actual display the data
// this is to test that the changes to the object is still trigger a rerender, even when not displayed
// see https://github.com/realm/realm-js/issues/5185
const App = ({ renderItems = true, targetPrimaryKey = parentObjectId }) => {
  return (
    <SetupComponent>
      <TestComponent testID="testContainer" renderItems={renderItems} targetPrimaryKey={targetPrimaryKey} />
    </SetupComponent>
  );
};

const parentObjectId = new Realm.BSON.ObjectId();

const SetupComponent = ({ children }: { children: JSX.Element }): JSX.Element | null => {
  const realm = useRealm();

  /*
  useEffect(() => {
    return () => {
      realm.close();
    };
  }, [realm]);
  */

  const [setupComplete, setSetupComplete] = useState(false);
  useEffect(() => {
    realm.write(() => {
      realm.deleteAll();
    });
    setSetupComplete(true);
  }, [realm]);

  if (!setupComplete) {
    return null;
  }

  return children;
};

const Item: React.FC<{ item: ListItem }> = React.memo(({ item }) => {
  itemRenderCounter();
  const realm = useRealm();
  const idString = item.id.toHexString();

  return (
    <View testID={`result${idString}`}>
      <View testID={`name${idString}`}>
        <Text>{item.name}</Text>
      </View>
      <TextInput
        testID={`input${idString}`}
        value={item.name}
        onChangeText={(text) => {
          realm.write(() => {
            item.name = text;
          });
        }}
      ></TextInput>
      <TouchableHighlight
        testID={`deleteButton${idString}`}
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

const keyExtractor = (item: ListItem) => `${item.id}`;

const renderItem: ListRenderItem<ListItem> = ({ item }) => <Item item={item} />;

const ItemList: React.FC<{ list: Realm.List<ListItem> }> = React.memo(({ list }) => {
  const [counter, setCounter] = useState(0);

  // This useEffect is to test that the list object reference is not changing when
  // the component is re-rendered.
  useEffect(() => {
    listChangeCounter();
  }, [list]);

  return (
    <>
      <FlatList data={list} keyExtractor={keyExtractor} renderItem={renderItem} />
      <TouchableHighlight
        testID={`rerenderListButton`}
        onPress={() => {
          setCounter(counter + 1);
        }}
      >
        <Text>Rerender</Text>
      </TouchableHighlight>
    </>
  );
});

const TestComponent: React.FC<{ testID?: string; renderItems?: boolean; targetPrimaryKey: Realm.BSON.ObjectId }> = ({
  testID,
  renderItems,
  targetPrimaryKey,
}) => {
  const list = useObject(List, targetPrimaryKey);
  const realm = useRealm();
  const [counter, setCounter] = useState(0);

  // This useEffect is to test that the list object reference is not changing when
  // the component is re-rendered.
  useEffect(() => {
    objectChangeCounter();
  }, [list]);

  if (list === null) {
    return <View testID={testID} />;
  }

  listRenderCounter();

  const listIdString = list.id.toHexString();

  return (
    <View testID={testID}>
      <View testID="list">{renderItems && <ItemList list={list.items} />}</View>
      <View testID={`list${listIdString}`}>
        <View testID={`listTitle${listIdString}`}>
          <Text>{list.title}</Text>
        </View>
        <TextInput
          testID={`listTitleInput${listIdString}`}
          value={list.title}
          onChangeText={(text) => {
            realm.write(() => {
              list.title = text;
            });
          }}
        ></TextInput>
        <TouchableHighlight
          testID={`deleteListButton${listIdString}`}
          onPress={() => {
            realm.write(() => {
              realm.delete(list);
            });
          }}
        >
          <Text>Delete</Text>
        </TouchableHighlight>
      </View>
      {list?.favoriteItem && (
        <View testID={`favoriteItem-${list?.favoriteItem.name}`}>
          <Text>{list?.favoriteItem.name}</Text>
        </View>
      )}
      <Text>{list?.tags[0]}</Text>
      <TouchableHighlight
        testID={`rerenderObjectButton`}
        onPress={() => {
          setCounter(counter + 1);
        }}
      >
        <Text>Rerender</Text>
      </TouchableHighlight>
    </View>
  );
};

async function setupTest() {
  const { getByTestId, getByText, debug, rerender } = render(<App />);
  await waitFor(() => getByTestId("testContainer"));

  // In order to test that `useObject` brings the non-existing object into view when it's created,
  // we do the creation after the app is rendered.
  testRealm.write(() => {
    testRealm.create(List, { id: parentObjectId, title: "List", items: testCollection });
  });

  const object = testRealm.objectForPrimaryKey(List, parentObjectId);
  if (!object) throw new Error("Object not found in Realm");
  await waitFor(() => getByTestId("list"));
  const collection = object.items;

  expect(listRenderCounter).toHaveBeenCalledTimes(1);
  expect(itemRenderCounter).toHaveBeenCalledTimes(10);

  return { getByTestId, getByText, debug, object, collection, rerender };
}

describe("useObject: rendering objects with a Realm.List property", () => {
  afterEach(() => {
    listRenderCounter.mockClear();
    itemRenderCounter.mockClear();
    objectChangeCounter.mockClear();
    listChangeCounter.mockClear();
  });

  afterAll(() => {
    testRealm.close();
  });

  describe("rendering single object", () => {
    it("renders an object in one render cycle", async () => {
      const { getByTestId } = render(<App />);

      // In order to test that `useObject` brings the non-existing object into view when it's created,
      // we do the creation after the app is rendered.
      testRealm.write(() => {
        testRealm.create(List, { id: parentObjectId, title: "List", items: testCollection });
      });

      await waitFor(() => getByTestId("list"));

      expect(listRenderCounter).toHaveBeenCalledTimes(1);
    });

    it("only re-renders the changed object when a property changes", async () => {
      const { getByTestId, getByText, object } = await setupTest();

      const idString = object.id.toHexString();

      const titleElement = getByTestId(`listTitle${idString}`);
      const inputComponent = getByTestId(`listTitleInput${idString}`);

      expect(titleElement).toHaveTextContent("List");
      expect(listRenderCounter).toHaveBeenCalledTimes(1);

      fireEvent.changeText(inputComponent, "ChangedList");

      await waitFor(() => getByText("ChangedList"));

      expect(titleElement).toHaveTextContent("ChangedList");
      expect(listRenderCounter).toHaveBeenCalledTimes(2);
    });

    it("it nullifies the object when it is deleted", async () => {
      const { getByTestId, object } = await setupTest();

      const idString = object.id.toHexString();

      const deleteButton = getByTestId(`deleteListButton${idString}`);

      fireEvent.press(deleteButton);

      await act(async () => {
        forceSynchronousNotifications(testRealm);
      });

      expect(object.isValid()).toBe(false);

      expect(testRealm.objectForPrimaryKey(List, parentObjectId)).toBe(null);

      const testContainer = getByTestId("testContainer");
      expect(testContainer).toBeEmptyElement();

      // List is now gone, so it wasn't detected as a render
      expect(listRenderCounter).toHaveBeenCalledTimes(1);
    });

    it("test changes to linked object", async () => {
      const { getByTestId } = await setupTest();
      const object = testRealm.objectForPrimaryKey(List, parentObjectId);
      if (!object) throw new Error("Object not found in Realm");

      await act(async () => {
        testRealm.write(() => {
          object.favoriteItem = object.items[0];
        });
        forceSynchronousNotifications(testRealm);
      });

      expect(getByTestId(`favoriteItem-${object.items[0].name}`)).toBeTruthy();

      await act(async () => {
        testRealm.write(() => {
          object.favoriteItem = object.items[1];
        });
        forceSynchronousNotifications(testRealm);
      });

      expect(getByTestId(`favoriteItem-${object.items[1].name}`)).toBeTruthy();

      await act(async () => {
        testRealm.write(() => {
          object.items[1].name = "apple";
        });
        forceSynchronousNotifications(testRealm);
      });

      expect(getByTestId(`favoriteItem-${object.items[1].name}`)).toBeTruthy();

      // We should only have re-rendered once, as only the last change actually modified an item
      expect(itemRenderCounter).toHaveBeenCalledTimes(11);
    });

    it("renders a different list if the target primary key changes", async () => {
      const { rerender, getByTestId } = await setupTest();

      const secondListId = new Realm.BSON.ObjectId();

      testRealm.write(() => {
        testRealm.create(List, { id: secondListId, title: "Second List", items: [] });
      });

      rerender(<App targetPrimaryKey={secondListId} />);

      let titleElement = getByTestId(`listTitle${secondListId.toHexString()}`);
      expect(titleElement).toHaveTextContent("Second List");

      const thirdListId = new Realm.BSON.ObjectId();

      testRealm.write(() => {
        testRealm.create(List, { id: thirdListId, title: "Third List", items: [] });
      });

      rerender(<App targetPrimaryKey={thirdListId} />);

      titleElement = getByTestId(`listTitle${thirdListId.toHexString()}`);
      expect(titleElement).toHaveTextContent("Third List");

      // Render the old id
      rerender(<App targetPrimaryKey={secondListId} />);

      await waitFor(() => getByTestId(`listTitle${secondListId.toHexString()}`));
      titleElement = getByTestId(`listTitle${secondListId.toHexString()}`);
      expect(titleElement).toHaveTextContent("Second List");
    });
    it("will return the same reference when state changes", async () => {
      const { getByTestId } = await setupTest();

      // Force a rerender
      const rerenderButton = getByTestId("rerenderObjectButton");

      // We expect the object to be re-rendered 3 times, once for the initial render, once for the
      // object itself coming into existence, and once adding list of items to the list
      const expectedCount = 3;

      // Update the state twice to ensure the object reference is the same and we don't have a false positive
      fireEvent.press(rerenderButton);
      expect(objectChangeCounter).toHaveBeenCalledTimes(expectedCount);

      fireEvent.press(rerenderButton);
      expect(objectChangeCounter).toHaveBeenCalledTimes(expectedCount);
    });
    it("will rerender when the realm database is cleared", async () => {
      await setupTest();

      const initialCount = 2;

      expect(objectChangeCounter).toHaveBeenCalledTimes(initialCount);

      await act(async () => {
        testRealm.write(() => {
          testRealm.deleteAll();
        });
        forceSynchronousNotifications(testRealm);
      });

      expect(objectChangeCounter).toHaveBeenCalledTimes(initialCount + 1);
    });
  });

  describe("rendering objects with a Realm.List property", () => {
    it("renders each visible item in the list once", async () => {
      const { getByTestId } = render(<App />);

      testRealm.write(() => {
        testRealm.create(List, { id: parentObjectId, title: "List", items: testCollection });
      });

      await waitFor(() => getByTestId("list"));

      expect(itemRenderCounter).toHaveBeenCalledTimes(10);
    });

    it("only re-renders the changed item when a list item's data changes", async () => {
      const { getByTestId, getByText, collection } = await setupTest();

      const id = collection[0].id;

      const idString = id.toHexString();

      const nameElement = getByTestId(`name${idString}`);
      const input = getByTestId(`input${idString}`);

      expect(nameElement).toHaveTextContent(idString);

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

      const idString = id.toHexString();

      const nextVisible = collection[10];

      const deleteButton = getByTestId(`deleteButton${idString}`);
      const nameElement = getByTestId(`name${idString}`);

      expect(nameElement).toHaveTextContent(idString);
      expect(itemRenderCounter).toHaveBeenCalledTimes(10);

      fireEvent.press(deleteButton);

      const nextIdString = nextVisible.id.toHexString();

      await waitFor(() => getByTestId(`name${nextIdString}`));

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
      const { collection } = await setupTest();
      testRealm.write(() => {
        collection.unshift(testRealm.create(ListItem, { id: new Realm.BSON.ObjectId(), name: "apple" }));
      });

      // Force Realm listeners to fire rather than waiting for the text "apple"
      // to appear, in order to match how the subsequent "does not re-render"
      // test works.
      await act(async () => {
        forceSynchronousNotifications(testRealm);
      });

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

    it("test that primitive lists render correctly", async () => {
      const { object } = await setupTest();

      testRealm.write(() => {
        const tags = ["apple", "banana", "cherry", "durian", "eggplant"];
        object.tags.push(...tags);
      });

      await act(async () => {
        forceSynchronousNotifications(testRealm);
      });

      // no assertion here, just checking that the test doesn't crash
    });

    it("re-renders the list even if the list items have not been rendered", async () => {
      const { getByTestId } = render(<App renderItems={false} />);

      const list = testRealm.write(() => {
        return testRealm.create(List, { id: parentObjectId, title: "List" });
      });

      await waitFor(() => getByTestId("list"));

      expect(listRenderCounter).toHaveBeenCalledTimes(1);

      testRealm.write(() => {
        list.items.push(testRealm.create(ListItem, testCollection[0]));
      });

      await act(async () => {
        forceSynchronousNotifications(testRealm);
      });

      expect(listRenderCounter).toHaveBeenCalledTimes(2);

      testRealm.write(() => {
        list.items.push(testRealm.create(ListItem, testCollection[1]));
      });

      await act(async () => {
        forceSynchronousNotifications(testRealm);
      });
      expect(listRenderCounter).toHaveBeenCalledTimes(3);
    });
  });
  it("will return the same reference when state changes", async () => {
    const { getByTestId } = await setupTest();

    // Force a rerender
    const rerenderButton = getByTestId("rerenderListButton");

    // We expect the object to be re-rendered 2 times, once for the initial render
    // and once for adding list of items to the list
    const expectedCount = 2;

    // Update the state twice to ensure the object reference is the same and we don't have a false positive
    fireEvent.press(rerenderButton);
    expect(objectChangeCounter).toHaveBeenCalledTimes(expectedCount);
    fireEvent.press(rerenderButton);
    expect(objectChangeCounter).toHaveBeenCalledTimes(expectedCount);
  });
});
