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
import {StyleSheet, Text, View} from 'react-native';

import {colors} from '../styles/colors';

/**
 * Loading indicator.
 */
export function Loading() {
  return (
    <View style={styles.loading}>
      <Text style={styles.text}>Loading the tasks...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.grayLight,
  },
  text: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.grayDark,
  },
});
