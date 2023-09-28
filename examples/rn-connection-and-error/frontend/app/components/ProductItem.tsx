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
import {StyleSheet, Text, View} from 'react-native';

import {Button} from './Button';
import {Product} from '../models/Product';
import {colors} from '../styles/colors';
import {fonts} from '../styles/fonts';

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
    <View style={styles.product}>
      <View>
        <Text style={styles.title}>Product</Text>
        <Text style={styles.info}>ID: {product._id.toHexString()}</Text>
        <Text style={styles.info}>Name: {product.name}</Text>
        <Text style={styles.info}>Price: ${product.price}</Text>
        <Text style={styles.info}>Num in stock: {product.numInStock}</Text>
      </View>
      <View style={styles.buttons}>
        <Button isSecondary onPress={() => update(product)} text="Update" />
        <Button isSecondary onPress={() => remove(product)} text="Remove" />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  product: {
    marginVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    textTransform: 'uppercase',
    fontFamily: fonts.primary,
    fontWeight: 'bold',
    color: colors.grayDark,
  },
  info: {
    fontFamily: fonts.primary,
    fontWeight: 'normal',
    color: colors.grayDark,
  },
  buttons: {
    justifyContent: 'space-evenly',
  },
});
