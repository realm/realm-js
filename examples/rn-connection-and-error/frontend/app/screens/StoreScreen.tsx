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
import {FlatList, Pressable, Text, View} from 'react-native';
import {useAuth} from '@realm/react';

import {useStore} from '../providers/StoreProvider';

export function StoreScreen() {
  const store = useStore();
  const {logOut} = useAuth();

  return (
    // TODO: Update
    <View>
      <Pressable onPress={logOut}>
        <Text>Log Out</Text>
      </Pressable>
      {store?.kiosks[0]?.products.length && (
        <FlatList
          data={store.kiosks[0].products}
          keyExtractor={product => product._id.toHexString()}
          renderItem={({item: product}) => <Text>{product.name}</Text>}
        />
      )}
    </View>
  );
}
