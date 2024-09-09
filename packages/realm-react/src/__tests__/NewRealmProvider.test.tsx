////////////////////////////////////////////////////////////////////////////
//
// Copyright 2024 Realm Inc.
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

import React, { createContext, useState } from "react";
import { Realm } from "realm";

import { createRealmProvider } from "../RealmProvider";
import { fireEvent, render } from "@testing-library/react-native";
import { Button, View } from "react-native";
import { RenderConstraint } from "./RenderConstraint";

function CounterButton() {
  const [counter, setCounter] = useState(0);
  return (
    <Button
      testID="counter"
      onPress={() => {
        setCounter(counter + 1);
      }}
      title={`Clicks: ${counter}`}
    />
  );
}

describe("RealmProvider", () => {
  afterEach(() => {
    Realm.clearTestState();
  });

  it("renders", () => {
    const context = createContext<Realm | null>(null);
    const RealmProvider = createRealmProvider(undefined, context);
    const result = render(
      <RenderConstraint updateLimit={2}>
        <RenderConstraint updateLimit={0} />
        <RealmProvider schema={[]}>
          <CounterButton />
          <RenderConstraint updateLimit={0} />
        </RealmProvider>
      </RenderConstraint>,
    );
    const counterButton = result.getByRole("button");
    expect(counterButton).toHaveTextContent("Clicks: 0");
    fireEvent.press(counterButton);
    expect(counterButton).toHaveTextContent("Clicks: 1");
    fireEvent.press(counterButton);
    expect(counterButton).toHaveTextContent("Clicks: 2");
  });
});
