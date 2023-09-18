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
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {Icon} from '../components/Icon';
import {MovieInfoScreen} from '../screens/MovieInfoScreen';
import {MoviesScreen} from '../screens/MoviesScreen';
import {colors} from '../styles/colors';
import {routes} from './routes';

export type MoviesNavigatorParamList = {
  [routes.MOVIES]: undefined;
  [routes.MOVIE]: undefined;
};
const Stack = createNativeStackNavigator<MoviesNavigatorParamList>();

/**
 * Navigator for the movie screens.
 */
export function MoviesNavigator() {
  return (
    <Stack.Navigator screenOptions={{headerTitleAlign: 'center'}}>
      <Stack.Screen
        name={routes.MOVIES}
        component={MoviesScreen}
        options={{
          headerLeft: HeaderIcon,
        }}
      />
      <Stack.Screen
        name={routes.MOVIE}
        component={MovieInfoScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}

function HeaderIcon() {
  return <Icon name="alpha-n" color={colors.red} size={50} />;
}
