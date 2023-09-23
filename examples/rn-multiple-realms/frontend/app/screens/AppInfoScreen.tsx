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
import {Pressable, StyleSheet, Text, View} from 'react-native';
// @ts-ignore `openURLInBrowser` will open the url in your host's browser. This
// is used for the purpose of this demo. For your own app, to open a URL on the
// simulator/device, import {Linking} from 'react-native' and use Linking.openURL().
import openURLInBrowser from 'react-native/Libraries/Core/Devtools/openURLInBrowser';

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
          // Opens link on the host's browser (used for this demo).
          // Use `Linking.openURL()` to open on the simulator/device.
          openURLInBrowser(
            'https://www.mongodb.com/docs/realm/sdk/react-native/',
          )
        }>
        <Text style={styles.link}>Realm React Native SDK</Text>
      </Pressable>
      <Pressable
        onPress={() =>
          openURLInBrowser(
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
