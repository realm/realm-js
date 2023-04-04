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
import { createRealmContext } from "..";

class Item extends Realm.Object {
  id!: number;
  name!: string;
  tags!: Realm.List<Tag>;

  static schema = {
    name: "Item",
    primaryKey: "id",
    properties: {
      id: "int",
      name: "string",
      tags: "Tag[]",
    },
  };
}

class Tag extends Realm.Object {
  id!: number;
  name!: string;

  static schema = {
    name: "Tag",
    primaryKey: "id",
    properties: {
      id: "int",
      name: "string",
    },
  };
}

// TODO: It would be better not to have to rely on this, but at the moment I see no other alternatives
function forceSynchronousNotifications(realm: Realm) {
  // Starting a transaction will force all listeners to advance to the latest version
  // and deliver notifications. We don't need to commit the transaction for this to work.
  realm.beginTransaction();
  realm.cancelTransaction();
}

const testCollection = [...new Array(30)].map((_, index) => ({ id: index, name: `${index}` }));

const configuration: Realm.Configuration = {
  schema: [Item, Tag],
  inMemory: true,
  path: "testArtifacts/use-query-rerender.realm",
};

const itemRenderCounter = jest.fn();
const tagRenderCounter = jest.fn();
const queryObjectChangeCounter = jest.fn();

let testRealm: Realm = new Realm(configuration);

const { useQuery, useObject, RealmProvider, useRealm } = createRealmContext(configuration);

enum QueryType {
  filtered,
  sorted,
  normal,
}

const App = ({ queryType = QueryType.normal, useUseObject = false }) => {
  return (
    <RealmProvider>
      <SetupComponent>
        <View testID="testContainer">
          <TestComponent queryType={queryType} useUseObject={useUseObject} />
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
      testCollection.forEach((object) => new Item(realm, object));
    });
    setSetupComplete(true);
  }, [realm]);

  if (!setupComplete) {
    return null;
  }

  return children;
};

const UseObjectItemComponent: React.FC<{ item: Item | (Item & Realm.Object) }> = React.memo(({ item }) => {
  // Testing that useObject also works and properly handles renders
  const localItem = useObject(Item, item.id);
  if (!localItem) {
    return null;
  }
  return <ItemComponent item={localItem}></ItemComponent>;
});

const renderTag: ListRenderItem<Tag> = ({ item }) => <TagComponent tag={item} />;
const tagKeyExtractor = (item: Tag) => `tag-${item.id}`;

const ItemComponent: React.FC<{ item: Item | (Item & Realm.Object) }> = React.memo(({ item }) => {
  itemRenderCounter();
  const realm = useRealm();

  return (
    <View testID={`result${item.id}`}>
      <View testID={`name${item.name}`}>
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
      <FlatList
        horizontal={true} // Make this internal list horizontal to avoid invariant error
        testID={`tagList-${item.id}`}
        data={item.tags}
        keyExtractor={tagKeyExtractor}
        renderItem={renderTag}
      />
    </View>
  );
});

const TagComponent: React.FC<{ tag: Tag }> = React.memo(({ tag }) => {
  tagRenderCounter();
  return (
    <View testID={`tagResult${tag.id}`}>
      <View testID={`tagName${tag.id}`}>
        <Text>{tag.name}</Text>
      </View>
    </View>
  );
});

const FILTER_ARGS: [string] = ["id < 20"];
const SORTED_ARGS: [string, boolean] = ["id", true];

const keyExtractor = (item: Item & Realm.Object) => `${item.id}`;

const TestComponent = ({ queryType, useUseObject }: { queryType: QueryType; useUseObject: boolean }) => {
  const collection = useQuery(Item);

  const [counter, setCounter] = useState(0);

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

  // This useEffect is to test that the list object reference is not changing when
  // the component is re-rendered.
  useEffect(() => {
    queryObjectChangeCounter();
  }, [result]);

  const renderItem = useCallback<ListRenderItem<Item & Realm.Object>>(
    ({ item }) => (useUseObject ? <UseObjectItemComponent item={item} /> : <ItemComponent item={item} />),
    [useUseObject],
  );

  return (
    <>
      <FlatList testID={"list"} data={result} keyExtractor={keyExtractor} renderItem={renderItem} />;
      <TouchableHighlight
        testID={`rerenderButton`}
        onPress={() => {
          setCounter(counter + 1);
        }}
      >
        <Text>Rerender</Text>
      </TouchableHighlight>
    </>
  );
};

function getTestCollection(queryType: QueryType) {
  switch (queryType) {
    case QueryType.filtered:
      return testRealm.objects(Item).filtered(...FILTER_ARGS);
    case QueryType.sorted:
      return testRealm.objects(Item).sorted(...SORTED_ARGS);
    case QueryType.normal:
      return testRealm.objects(Item);
  }
}

type setupOptions = {
  queryType?: QueryType;
  useUseObject?: boolean;
};

const setupTest = async ({ queryType = QueryType.normal, useUseObject = false }: setupOptions) => {
  const renderResult = render(<App queryType={queryType} useUseObject={useUseObject} />);
  await waitFor(() => renderResult.getByTestId("testContainer"));

  const collection = getTestCollection(queryType);
  expect(itemRenderCounter).toHaveBeenCalledTimes(10);

  return { ...renderResult, collection };
};

describe.each`
  queryTypeName | queryType
  ${"normal"}   | ${QueryType.normal}
  ${"filtered"} | ${QueryType.filtered}
  ${"sorted"}   | ${QueryType.sorted}
`("useQueryRender: $queryTypeName", ({ queryType }) => {
  beforeEach(() => {
    testRealm = new Realm(configuration);
  });
  afterEach(() => {
    itemRenderCounter.mockClear();
    tagRenderCounter.mockClear();
    queryObjectChangeCounter.mockClear();
    Realm.clearTestState();
  });

  it("renders data in one render cycle per visible object in collection", async () => {
    const { getByTestId } = render(<App queryType={queryType} />);

    await waitFor(() => getByTestId("list"));

    expect(itemRenderCounter).toHaveBeenCalledTimes(10);
  });
  it("change to data will rerender", async () => {
    const { getByTestId, getByText, collection } = await setupTest({ queryType });

    const firstItem = collection[0];
    const id = firstItem.id;

    const nameElement = getByTestId(`name${id}`);
    const input = getByTestId(`input${id}`);

    expect(nameElement).toHaveTextContent(`${id}`);

    fireEvent.changeText(input, "apple");

    // Wait for change events to finish their callbacks
    await act(async () => {
      forceSynchronousNotifications(testRealm);
    });

    expect(nameElement).toHaveTextContent("apple");
    expect(itemRenderCounter).toHaveBeenCalledTimes(11);
  });

  // TODO:  This is a known issue that we have to live with until it is possible
  // to retrieve the objectId from a deleted object in a listener callback
  it.skip("handles deletions", async () => {
    const { getByTestId, collection } = await setupTest({ queryType });

    const firstItem = collection[0];
    const id = firstItem.id;

    const nextVisible = collection[10];

    const deleteButton = getByTestId(`deleteButton${id}`);
    const nameElement = getByTestId(`name${id}`);

    expect(nameElement).toHaveTextContent(`${id}`);
    expect(itemRenderCounter).toHaveBeenCalledTimes(10);

    fireEvent.press(deleteButton);

    await waitFor(() => getByTestId(`name${nextVisible.id}`));

    expect(itemRenderCounter).toHaveBeenCalledTimes(11);
  });
  it("an implicit update to an item in the FlatList view area causes a rerender", async () => {
    const { collection } = await setupTest({ queryType });

    testRealm.write(() => {
      collection[0].name = "apple";
    });

    // One could wait for "apple", but I want to mirror the underlying non-rerender test
    await act(async () => {
      forceSynchronousNotifications(testRealm);
    });

    expect(itemRenderCounter).toHaveBeenCalledTimes(11);
  });

  it("does not rerender if the update is out of the FlatList view area", async () => {
    const { collection } = await setupTest({ queryType });

    testRealm.write(() => {
      const lastIndex = collection.length - 1;
      collection[lastIndex].name = "apple";
    });

    await act(async () => {
      forceSynchronousNotifications(testRealm);
    });

    expect(itemRenderCounter).toHaveBeenCalledTimes(10);
  });
  it("collection objects rerender on changes to their linked objects", async () => {
    const { collection, getByText, queryByText } = await setupTest({ queryType });

    // Insert some tags into visible Items
    testRealm.write(() => {
      const tag1 = testRealm.create(Tag, { id: 1, name: "a123" });
      const tag2 = testRealm.create(Tag, { id: 2, name: "b234" });
      const tag3 = testRealm.create(Tag, { id: 3, name: "c567" });

      collection[0].tags.push(tag1);
      collection[0].tags.push(tag2);

      collection[1].tags.push(tag1);
      collection[1].tags.push(tag2);

      collection[2].tags.push(tag1);
      collection[2].tags.push(tag2);
      collection[2].tags.push(tag3);
    });

    act(() => {
      forceSynchronousNotifications(testRealm);
    });

    expect(getByText("c567")).not.toBeNull();

    expect(tagRenderCounter).toHaveBeenCalledTimes(7);

    // Changes to a linked object will re-render once
    testRealm.write(() => {
      collection[2].tags[2].name = "765c";
    });

    act(() => {
      forceSynchronousNotifications(testRealm);
    });

    expect(getByText("765c")).not.toBeNull();

    testRealm.write(() => {
      testRealm.delete(collection[2].tags[2]);
    });

    act(() => {
      forceSynchronousNotifications(testRealm);
    });

    expect(queryByText("756c")).toBeNull();
  });
  // This replicates the issue https://github.com/realm/realm-js/issues/4375
  it("will handle multiple async transactions", async () => {
    const { queryByTestId } = await setupTest({ queryType, useUseObject: true });
    const performTest = async () => {
      testRealm.write(() => {
        testRealm.deleteAll();
      });
      let i = 0;
      while (i < 10) {
        await new Promise((resolve) => setTimeout(resolve, 10));
        const id = i;
        testRealm.write(() => {
          return new Item(testRealm, { id, name: `${id}` });
        });
        await new Promise((resolve) => setTimeout(resolve, 0));
        testRealm.write(() => {
          const item = testRealm.objectForPrimaryKey(Item, id);
          if (item) {
            item.name = `${id + 100}`;
          }
        });
        i++;
      }
    };

    await act(async () => {
      await performTest();
    });

    await waitFor(() => queryByTestId(`name${109}`));
  });

  it("will return the same reference when state changes", async () => {
    const { getByTestId } = await setupTest({ queryType });

    // Force a rerender
    const rerenderButton = getByTestId("rerenderButton");

    // Update the state twice to ensure the object reference is the same and we don't have a false positive
    fireEvent.press(rerenderButton);
    expect(queryObjectChangeCounter).toHaveBeenCalledTimes(1);

    fireEvent.press(rerenderButton);
    expect(queryObjectChangeCounter).toHaveBeenCalledTimes(1);
  });
});
