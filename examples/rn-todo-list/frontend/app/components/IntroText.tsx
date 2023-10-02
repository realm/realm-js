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
        Start by adding a task ☝ You can then update it by toggling its status,
        or remove it by hitting the "x" icon. If using Device Sync, watch the
        tasks sync across devices or to Atlas in real-time. To see what happens
        when you make changes while offline, toggle "Pause Sync".
      </Text>
      <Text style={styles.paragraph}>Learn more at:</Text>
      <Pressable
        accessibilityLabel="Open link"
        accessibilityHint="Opens a link to Atlas Device SDK in your browser"
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
        accessibilityLabel="Open link"
        accessibilityHint="Opens a link to Atlas Device Sync in your browser"
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
    marginTop: 50,
    marginHorizontal: 20,
  },
  paragraph: {
    marginVertical: 10,
    textAlign: 'center',
    fontSize: 17,
    lineHeight: 22,
    color: colors.black,
  },
  link: {
    fontWeight: 'bold',
    color: colors.purple,
  },
});
