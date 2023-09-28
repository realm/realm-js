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
import {
  GestureResponderEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';

import {colors} from '../styles/colors';

type ButtonProps = {
  onPress: (event: GestureResponderEvent) => void;
  text: string;
  extraStyles?: ViewStyle[];
};

export function Button({onPress, text, extraStyles = []}: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({pressed}) => [
        styles.button,
        styles.shadow,
        pressed && styles.pressed,
        ...extraStyles,
      ]}>
      <Text style={[styles.buttonText]}>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 15,
    borderWidth: 1,
    borderRadius: 30,
    borderColor: colors.grayMedium,
    backgroundColor: colors.purple,
  },
  buttonText: {
    textAlign: 'center',
    fontWeight: 'bold',
    color: colors.white,
  },
  pressed: {
    opacity: 0.8,
  },
  shadow: {
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 5,
      },
      android: {
        elevation: 2,
      },
    }),
  },
});
