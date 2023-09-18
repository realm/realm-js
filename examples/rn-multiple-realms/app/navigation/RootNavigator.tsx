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
import {
  DarkTheme,
  NavigationContainer,
  NavigatorScreenParams,
} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';

import {AccountScreen} from '../screens/AccountScreen';
import {AppInfoScreen} from '../screens/AppInfoScreen';
import {Icon} from '../components/Icon';
import {MoviesNavigator, MoviesNavigatorParamList} from './MoviesNavigator';
import {colors} from '../styles/colors';
import {routes} from './routes';

export type RootNavigatorParamList = {
  [routes.HOME]: NavigatorScreenParams<MoviesNavigatorParamList>;
  [routes.APP_INFO]: undefined;
  [routes.ACCOUNT]: undefined;
};
const Tab = createBottomTabNavigator<RootNavigatorParamList>();

/**
 * Navigator for the bottom tabs.
 */
export function RootNavigator() {
  return (
    <NavigationContainer theme={DarkTheme}>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: colors.white,
          tabBarInactiveTintColor: colors.grayDark,
        }}>
        <Tab.Screen
          name={routes.HOME}
          component={MoviesNavigator}
          options={{
            headerShown: false,
            tabBarAccessibilityLabel: routes.HOME,
            tabBarIcon: ({color, size}) => (
              <Icon name="home-outline" color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name={routes.APP_INFO}
          component={AppInfoScreen}
          options={{
            headerShown: false,
            tabBarAccessibilityLabel: routes.APP_INFO,
            tabBarIcon: ({color, size}) => (
              <Icon name="information-variant" color={color} size={size} />
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
