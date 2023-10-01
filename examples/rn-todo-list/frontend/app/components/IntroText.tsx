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

import {colors} from '../styles/colors';

/**
 * Information about this example app and the Atlas Device SDK for React Native.
 */
export function IntroText() {
  return (
    <View style={styles.content}>
      <Text style={styles.paragraph}>
        Welcome to the Atlas Device SDK for React Native!
      </Text>
      <Text style={styles.paragraph}>
        Start adding a task using the form at the top of the screen to see how
        they are created. Update a task by toggling its status, or remove it
        from the list. If using Device Sync, watch the tasks sync across devices
        or to Atlas in real-time.
      </Text>
      <Text style={styles.paragraph}>Learn more at:</Text>
      <Pressable
        onPress={() =>
          // Opens the link on the host's browser (used for this demo).
          // Use `Linking.openURL()` to open on the simulator/device.
          openURLInBrowser(
            'https://www.mongodb.com/docs/realm/sdk/react-native/',
          )
        }>
        <Text style={[styles.paragraph, styles.link]}>
          Atlas Device SDK for React Native
        </Text>
      </Pressable>
      <Pressable
        onPress={() =>
          openURLInBrowser(
            'https://www.mongodb.com/atlas/app-services/device-sync',
          )
        }>
        <Text style={[styles.paragraph, styles.link]}>Atlas Device Sync</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    marginHorizontal: 20,
    justifyContent: 'center',
  },
  paragraph: {
    marginVertical: 10,
    textAlign: 'center',
    color: 'white',
    fontSize: 17,
    fontWeight: '500',
  },
  link: {
    color: colors.purple,
    fontWeight: 'bold',
  },
});
