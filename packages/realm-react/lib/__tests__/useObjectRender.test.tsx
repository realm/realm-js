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
import { View, TextInput, TouchableHighlight, Text } from "react-native";
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

const testObject = { id: 1, name: "stapler" };

const { RealmProvider, useRealm, useObject } = createRealmContext({
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
      realm.create("Object", testObject);
    });
    setSetupComplete(true);
  }, [realm]);

  if (!setupComplete) {
    return null;
  }

  return children;
};

const TestComponent = () => {
  const { data: object, error } = useObject<IObject>("Object", testObject.id);
  const realm = useRealm();
  renderCounter();

  if (error?.message) {
    console.error(error?.message);
    return null;
  }
  if (!object) {
    return null;
  }

  return (
    <View testID="result">
      <View testID="name">{object.name}</View>
      <TextInput
        testID="inputComponent"
        value={object.name}
        onChangeText={(text) => {
          realm.write(() => {
            object.name = text;
          });
        }}
      ></TextInput>
      <TouchableHighlight
        testID="deleteButton"
        onPress={() => {
          realm.write(() => {
            realm.delete(object);
          });
        }}
      >
        <Text>Delete</Text>
      </TouchableHighlight>
    </View>
  );
};

describe("useObject", () => {
  beforeEach(() => {
    renderCounter.mockClear();
  });
  it("renders data in one render cycle", async () => {
    const { getByTestId } = render(<App />);

    const element = await waitFor(() => getByTestId("result"));
    const [nameElement] = element.children;

    expect(nameElement).toHaveTextContent("stapler");
    expect(renderCounter).toHaveBeenCalledTimes(1);
  });
  it("change to data will rerender", async () => {
    const { getByTestId } = render(<App />);

    const element = await waitFor(() => getByTestId("result"));
    const [nameElement, inputComponent] = element.children;

    expect(nameElement).toHaveTextContent("stapler");
    expect(renderCounter).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.changeText(inputComponent as ReactTestInstance, "pencil");
    });

    expect(nameElement).toHaveTextContent("pencil");
    expect(renderCounter).toHaveBeenCalledTimes(2);
  });
  it("it does something when the object is deleted", async () => {
    const { getByTestId, queryByTestId } = render(<App />);

    const [element, testContainer] = await waitFor(() => [getByTestId("result"), getByTestId("testContainer")]);
    const [, , deleteButton] = element.children;

    expect(testContainer).not.toBeEmpty();
    expect(testContainer).toContainElement(element);

    await act(async () => {
      fireEvent.press(deleteButton as ReactTestInstance);
    });

    const newTestContainer = queryByTestId("testContainer");
    const newResult = queryByTestId("result");

    expect(newTestContainer).not.toContainElement(newResult);

    expect(newResult).toBeNull();
  });
});
