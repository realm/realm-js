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

import React, {useEffect, useState} from 'react';
import {Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import {AuthOperationName, useEmailPasswordAuth} from '@realm/react';

import {buttonStyles} from '../styles/button';
import {colors} from '../styles/colors';
import {shadows} from '../styles/shadows';

/**
 * Screen for registering and/or logging in to the App Services App.
 */
export function LoginScreen() {
  // Here we use the email/password auth hook, but you may also use
  // the `useAuth()` hook for all auth operations.
  const {logIn, register, result} = useEmailPasswordAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Automatically log in the user after successful registration.
  useEffect(() => {
    if (result.success && result.operation === AuthOperationName.Register) {
      logIn({email, password});
    }
  }, [result, logIn, email, password]);

  return (
    <View style={styles.content}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoComplete="email"
          textContentType="emailAddress"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Email"
        />
      </View>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          textContentType="password"
          placeholder="Password"
        />
      </View>
      {result.error?.operation === AuthOperationName.LogIn && (
        <Text style={[styles.error]}>
          There was an error logging in, please try again
        </Text>
      )}
      {result.error?.operation === AuthOperationName.Register && (
        <Text style={[styles.error]}>
          There was an error registering, please try again
        </Text>
      )}
      <View style={styles.buttons}>
        <Pressable
          onPress={() => logIn({email, password})}
          style={[styles.button, result.pending && styles.buttonDisabled]}
          disabled={result.pending}>
          <Text style={buttonStyles.text}>Login</Text>
        </Pressable>
        <Pressable
          onPress={() => register({email, password})}
          style={[
            styles.button,
            result.pending && styles.buttonDisabled,
            styles.registerButton,
          ]}
          disabled={result.pending}>
          <Text style={buttonStyles.text}>Register</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.darkBlue,
  },

  inputContainer: {
    padding: 10,
    alignSelf: 'stretch',
    marginHorizontal: 10,
  },

  error: {
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 10,
    fontSize: 14,
    color: colors.white,
  },

  input: {
    borderWidth: 1,
    borderColor: colors.gray,
    padding: 10,
    height: 50,
    marginVertical: 8,
    backgroundColor: colors.white,
    borderRadius: 5,
    ...shadows,
  },

  buttons: {
    marginTop: 16,
    flexDirection: 'row',
  },

  button: {
    ...buttonStyles.button,
    ...shadows,
  },

  buttonDisabled: {
    opacity: 0.5,
  },

  registerButton: {
    backgroundColor: colors.purpleDark,
  },
});
