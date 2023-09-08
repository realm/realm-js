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
import {DarkTheme, NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';

import {AccountScreen} from '../screens/AccountScreen';
import {HomeNavigator} from './HomeNavigator';
import {Icon} from '../components/Icon';
import {colors} from '../styles/colors';
import {routes} from './routes';

const Tab = createBottomTabNavigator();

// TODO: Remove
function Temp() {
  return (
    <View>
      <Text>TODO</Text>
    </View>
  );
}

export function RootNavigator() {
  return (
    <NavigationContainer theme={DarkTheme}>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: colors.white,
          tabBarInactiveTintColor: colors.grayDark,
          headerTitleAlign: 'center',
        }}>
        <Tab.Screen
          name={routes.HOME}
          component={HomeNavigator}
          options={{
            headerShown: false,
            tabBarAccessibilityLabel: routes.HOME,
            tabBarIcon: ({color, size}) => (
              <Icon name="home-outline" color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name={routes.SEARCH}
          component={Temp}
          options={{
            tabBarAccessibilityLabel: routes.SEARCH,
            tabBarIcon: ({color, size}) => (
              <Icon name="magnify" color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name={routes.ACCOUNT}
          component={AccountScreen}
          options={{
            headerShown: false,
            tabBarAccessibilityLabel: routes.ACCOUNT,
            tabBarIcon: ({color, size}) => (
              <Icon name="account-outline" color={color} size={size} />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
