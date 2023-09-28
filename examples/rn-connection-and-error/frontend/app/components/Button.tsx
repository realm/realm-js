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
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';

import {colors} from '../styles/colors';

type ButtonProps = {
  isSecondary?: boolean;
  onPress: (event: GestureResponderEvent) => void;
  text: string;
  extraStyles?: ViewStyle[];
};

export function Button({
  isSecondary = false,
  onPress,
  text,
  extraStyles = [],
}: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({pressed}) => [
        styles.button,
        isSecondary && styles.buttonSecondary,
        pressed && styles.pressed,
        ...extraStyles,
      ]}>
      <Text
        style={[styles.buttonText, isSecondary && styles.buttonTextSecondary]}>
        {text}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 15,
    borderWidth: 1,
    borderRadius: 30,
    borderColor: colors.purple,
    backgroundColor: colors.purple,
  },
  buttonSecondary: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderColor: colors.grayDark,
    backgroundColor: colors.white,
  },
  buttonText: {
    textAlign: 'center',
    fontWeight: 'bold',
    color: colors.white,
  },
  buttonTextSecondary: {
    color: colors.grayDark,
  },
  pressed: {
    opacity: 0.8,
  },
});
