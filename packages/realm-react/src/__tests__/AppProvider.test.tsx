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
import React, { useState } from "react";
import { renderHook } from "@testing-library/react-hooks";
import { AppProvider, useApp } from "../AppProvider";
import { View, Text, Button } from "react-native";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

describe("AppProvider", () => {
  it("returns the configured app with useApp", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AppProvider id="someId" app={{ name: "someName", version: "42" }} baseUrl="someurl">
        {children}
      </AppProvider>
    );
    const { result } = renderHook(() => useApp(), { wrapper });
    const app = result.current;
    expect(app.id).toBe("someId");
  });

  it("throws useApp is used without having the AppProvider is rendered", () => {
    const { result } = renderHook(() => useApp());
    expect(() => result.current).toThrow();
  });

  it("handle state changes to its configuration", async () => {
    const AppComponent = () => {
      const app = useApp();
      return <Text testID="appId">{app.id}</Text>;
    };
    const App = () => {
      const [id, setId] = useState("someId");
      return (
        <>
          <View testID="firstRealmProvider">
            <AppProvider id={id}>
              <AppComponent />
            </AppProvider>
          </View>
          <Button testID="changeId" title="change app id" onPress={() => setId("newId")} />
        </>
      );
    };
    const { getByTestId } = render(<App />);
    const schemaNameContainer = await waitFor(() => getByTestId("appId"));
    const changeSchemaButton = getByTestId("changeId");

    expect(schemaNameContainer).toHaveTextContent("someId");

    await act(async () => {
      fireEvent.press(changeSchemaButton);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // Changing the realm provider configuration will cause a remount
    // of the child component.  Therefore it must be retreived again
    const newSchemaNameContainer = getByTestId("appId");

    expect(newSchemaNameContainer).toHaveTextContent("newId");
  });
});
