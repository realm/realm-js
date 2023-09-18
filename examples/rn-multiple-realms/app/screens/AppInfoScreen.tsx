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
import {Linking, Pressable, StyleSheet, Text, View} from 'react-native';

import {Icon} from '../components/Icon';
import {colors} from '../styles/colors';

/**
 * Information about this example app and the Realm React Native SDK.
 */
export function AppInfoScreen() {
  return (
    <View style={styles.container}>
      <Icon name="alpha-n" color={colors.red} size={200} style={styles.logo} />
      <Text style={styles.paragraph}>
        Welcome to the Netflix-like example app!
      </Text>
      <Text style={styles.paragraph}>
        This example app showcases how to use different Realms in MongoDB's
        Realm React Native SDK. All users can browse (not play) movies from
        MongoDB's Mflix sample dataset, but only users who register with email
        and password are able to sync, read, add, and remove movies saved to "My
        List".
      </Text>
      <Text style={styles.paragraph}>Learn more at:</Text>
      <Pressable
        onPress={() =>
          Linking.openURL(
            'https://www.mongodb.com/docs/realm/sdk/react-native/',
          )
        }>
        <Text style={styles.link}>Realm React Native SDK</Text>
      </Pressable>
      <Pressable
        onPress={() =>
          Linking.openURL(
            'https://www.mongodb.com/atlas/app-services/device-sync',
          )
        }>
        <Text style={styles.link}>Atlas Device Sync</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  logo: {
    marginTop: 50,
  },
  paragraph: {
    marginVertical: 20,
    textAlign: 'center',
    color: colors.white,
    fontSize: 16,
    lineHeight: 25,
  },
  link: {
    marginBottom: 10,
    textAlign: 'center',
    color: colors.blue,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
