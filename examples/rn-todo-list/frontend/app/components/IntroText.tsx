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
import {View, Text, Pressable, StyleSheet} from 'react-native';
// @ts-ignore openURLInBrowser will open the url in your machine browser. (This isn't currently typed in React Native)
import openURLInBrowser from 'react-native/Libraries/Core/Devtools/openURLInBrowser';

import colors from '../styles/colors';

export const IntroText = () => {
  return (
    <View style={styles.content}>
      <Text style={styles.paragraph}>
        Welcome to the Realm React Native TypeScript Template
      </Text>
      <Text style={styles.paragraph}>
        Start adding a task using the form at the top of the screen to see how
        they are created in Realm. You can also toggle the task status or remove
        it from the list.
      </Text>
      <Text style={styles.paragraph}>
        Learn more about the React Native Realm SDK at:
      </Text>
      <Pressable
        onPress={() =>
          openURLInBrowser('https://docs.mongodb.com/realm/sdk/react-native/')
        }>
        <Text style={[styles.paragraph, styles.link]}>
          docs.mongodb.com/realm/sdk/react-native
        </Text>
      </Pressable>
    </View>
  );
};

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
