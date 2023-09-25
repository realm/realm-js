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

import React, {memo} from 'react';
import {Text, View} from 'react-native';

import {Button} from './Button';
import {Product} from '../models/Product';

type ProductItemProps = {
  product: Product;
  update: (product: Product) => void;
  remove: (product: Product) => void;
};

/**
 * Displays a product list item.
 */
export const ProductItem = memo(function ({
  product,
  update,
  remove,
}: ProductItemProps) {
  return (
    <View>
      <Text>Product</Text>
      <Text>ID: {product._id.toHexString()}</Text>
      <Text>Name: {product.name}</Text>
      <Text>Price: ${product.price}</Text>
      <Text>Num in stock: {product.numInStock}</Text>
      <Button onPress={() => update(product)} text="Update" />
      <Button onPress={() => remove(product)} text="Remove" />
    </View>
  );
});
