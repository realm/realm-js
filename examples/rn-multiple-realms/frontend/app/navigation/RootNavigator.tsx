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
            tabBarIcon: HomeTabIcon,
          }}
        />
        <Tab.Screen
          name={routes.APP_INFO}
          component={AppInfoScreen}
          options={{
            headerShown: false,
            tabBarAccessibilityLabel: routes.APP_INFO,
            tabBarIcon: AppInfoTabIcon,
          }}
        />
        <Tab.Screen
          name={routes.ACCOUNT}
          component={AccountScreen}
          options={{
            headerShown: false,
            tabBarAccessibilityLabel: routes.ACCOUNT,
            tabBarIcon: AccountTabIcon,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

// Tab icons are defined here rather than inline to prevent the following eslint error:
//      Do not define components during render. React will see a new component type
//      on every render and destroy the entire subtree’s DOM nodes and state
//      (https://reactjs.org/docs/reconciliation.html#elements-of-different-types).
//      Instead, move this component definition out of the parent component “RootNavigator”
//      and pass data as props. If you want to allow component creation in props, set
//      allowAsProps option to true. eslintreact/no-unstable-nested-components:
//      https://stackoverflow.com/questions/75493412/react-native-eslint-disable-next-line-react-no-unstable-nested-components
function HomeTabIcon({color, size}: {color: string; size: number}) {
  return <Icon name="home-outline" color={color} size={size} />;
}

function AppInfoTabIcon({color, size}: {color: string; size: number}) {
  return <Icon name="information-variant" color={color} size={size} />;
}

function AccountTabIcon({color, size}: {color: string; size: number}) {
  return <Icon name="account-outline" color={color} size={size} />;
}
