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
import {GestureResponderEvent, Pressable, StyleSheet, Text} from 'react-native';

import {colors} from '../styles/colors';

type ButtonProps = {
  disabled?: boolean;
  isPrimary: boolean;
  onPress: (event: GestureResponderEvent) => void;
  text: string;
};

export function Button({
  disabled = false,
  isPrimary,
  onPress,
  text,
}: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({pressed}) => [
        styles.button,
        isPrimary ? styles.buttonPrimary : styles.buttonSecondary,
        pressed && styles.pressed,
      ]}>
      <Text
        style={[
          styles.buttonText,
          isPrimary ? styles.buttonTextPrimary : styles.buttonTextSecondary,
        ]}>
        {text}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '40%',
    height: 50,
    marginHorizontal: 5,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
  buttonPrimary: {
    backgroundColor: colors.red,
  },
  buttonSecondary: {
    backgroundColor: colors.white,
  },
  buttonText: {
    fontWeight: 'bold',
  },
  buttonTextPrimary: {
    color: colors.white,
  },
  buttonTextSecondary: {
    color: colors.black,
  },
  pressed: {
    opacity: 0.8,
  },
});
