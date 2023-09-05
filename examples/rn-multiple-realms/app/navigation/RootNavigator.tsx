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
        }}>
        {/* screenOptions={({route}) => ({
          tabBarIcon: ({focused, color, size}) => {
            let iconName = '';
            switch (route.name) {
              case routes.HOME:
                iconName = 'home-outline';
                break;
              case routes.SEARCH:
                iconName = 'magnify';
                break;
              case routes.ACCOUNT:
                iconName = 'account-outline';
                break;
            }
            return <Icon name={iconName} color={color} size={size} />;
          },
          tabBarActiveTintColor: colors.white,
          tabBarInactiveTintColor: colors.grayDark,
        })}> */}
        <Tab.Screen
          name={routes.HOME}
          component={HomeNavigator}
          options={{
            tabBarIcon: ({color, size}) => (
              <Icon name="home-outline" color={color} size={size} />
            ),
            tabBarAccessibilityLabel: routes.HOME,
          }}
        />
        <Tab.Screen
          name={routes.SEARCH}
          component={Temp}
          options={{
            tabBarIcon: ({color, size}) => (
              <Icon name="magnify" color={color} size={size} />
            ),
            tabBarAccessibilityLabel: routes.SEARCH,
          }}
        />
        <Tab.Screen
          name={routes.ACCOUNT}
          component={Temp}
          options={{
            tabBarIcon: ({color, size}) => (
              <Icon name="account-outline" color={color} size={size} />
            ),
            tabBarAccessibilityLabel: routes.ACCOUNT,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
