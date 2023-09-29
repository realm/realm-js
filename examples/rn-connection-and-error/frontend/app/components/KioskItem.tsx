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

import React, {memo, useState} from 'react';
import {FlatList, Pressable, StyleSheet, Text, View} from 'react-native';

import type {Kiosk} from '../models/Kiosk';
import type {Product} from '../models/Product';
import {ProductItem} from './ProductItem';
import {colors} from '../styles/colors';
import {fonts} from '../styles/fonts';

type KioskItemProps = {
  kiosk: Kiosk;
  updateProduct: (product: Product) => void;
  removeProduct: (product: Product) => void;
};

/**
 * Displays a kiosk list item containing its products.
 */
export const KioskItem = memo(function ({
  kiosk,
  updateProduct,
  removeProduct,
}: KioskItemProps) {
  const [expanded, setExpanded] = useState(true);

  const toggleExpanded = () => setExpanded(!expanded);

  return (
    <View style={styles.kiosk}>
      <Pressable
        accessibilityLabel={expanded ? 'Hide products' : 'Show products'}
        onPress={toggleExpanded}
        style={[styles.accordion, expanded && styles.accordionExpanded]}>
        <View>
          <Text style={styles.title}>Kiosk</Text>
          <Text style={styles.info}>ID: {kiosk._id.toHexString()}</Text>
        </View>
        <View
          style={[
            styles.chevron,
            expanded ? styles.chevronExpanded : styles.chevronCollapsed,
          ]}>
          <Text style={styles.chevronChar}>^</Text>
        </View>
      </Pressable>
      <FlatList
        data={kiosk.products}
        keyExtractor={product => product._id.toHexString()}
        renderItem={({item: product}) => (
          <ProductItem
            product={product}
            update={updateProduct}
            remove={removeProduct}
          />
        )}
        ListEmptyComponent={<Text style={styles.info}>No products</Text>}
        style={[!expanded && styles.hide, styles.products]}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  kiosk: {
    marginVertical: 10,
  },
  accordion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderRadius: 30,
    borderColor: colors.grayMedium,
    backgroundColor: colors.white,
  },
  accordionExpanded: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  title: {
    textTransform: 'uppercase',
    fontFamily: fonts.primary,
    fontWeight: 'bold',
    color: colors.grayDark,
  },
  info: {
    color: colors.grayDark,
  },
  chevron: {
    justifyContent: 'center',
  },
  chevronExpanded: {
    marginTop: 8,
    transform: 'rotate(0deg)',
  },
  chevronCollapsed: {
    marginTop: -8,
    transform: 'rotate(180deg)',
  },
  chevronChar: {
    fontSize: 25,
    color: colors.grayDark,
  },
  products: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    borderColor: colors.grayMedium,
  },
  hide: {
    display: 'none',
  },
});
