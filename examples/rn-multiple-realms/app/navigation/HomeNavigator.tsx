////////////////////////////////////////////////////////////////////////////
//
// Copyright 2023 Realm Inc.
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

import React from 'react';
import {Text, View} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {routes} from './routes';

const Stack = createNativeStackNavigator();

// TODO: Remove
function Temp() {
  return (
    <View>
      <Text>TODO</Text>
    </View>
  );
}

export function HomeNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name={routes.HOME}
        component={Temp}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name={routes.MY_LIST}
        component={Temp}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}
