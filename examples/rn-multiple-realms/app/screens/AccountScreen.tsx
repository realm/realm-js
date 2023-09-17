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
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {AuthOperationName, useEmailPasswordAuth} from '@realm/react';

import {Button} from '../components/Button';
import {Icon} from '../components/Icon';
import {colors} from '../styles/colors';
import {useAccountInfo} from '../hooks/useAccountInfo';

/**
 * Screen for registering and/or logging in to the Atlas App if the user
 * is anonymous, or showing the account information if the user is already
 * logged in with their email.
 *
 * @note
 * For this example app, users are logged in automatically as anonymous
 * users so that all users can see what content exists. In this app, they
 * are referred to as "public". Once they log in using their email and
 * password, they get their own private accounts.
 */
export function AccountScreen() {
  const {logIn, logOut, register, result} = useEmailPasswordAuth();
  const {email: registeredEmail, isPublicAccount} = useAccountInfo();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (result.operation === AuthOperationName.Register && result.success) {
      logIn({email, password});
    }
  }, [email, password, result.operation, result.success, logIn]);

  return isPublicAccount ? (
    // View for logging in or registering.
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={50}
      style={styles.container}>
      <Icon name="alpha-n" color={colors.red} size={200} style={styles.logo} />
      <TextInput
        accessibilityLabel="Enter email"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardAppearance="dark"
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="Email"
        placeholderTextColor={colors.grayDark}
        style={styles.input}
        textContentType="emailAddress"
        value={email}
      />
      <TextInput
        accessibilityLabel="Enter password"
        keyboardAppearance="dark"
        onChangeText={setPassword}
        placeholder="Password"
        placeholderTextColor={colors.grayDark}
        secureTextEntry
        style={styles.input}
        textContentType="password"
        value={password}
      />
      <View style={styles.errorContainer}>
        {result.error && (
          <Text style={styles.error}>{result.error.message}</Text>
        )}
      </View>
      <View style={styles.buttons}>
        <Button
          disabled={result.pending}
          isPrimary
          onPress={() => logIn({email, password})}
          text="Log In"
        />
        <Button
          disabled={result.pending}
          isPrimary={false}
          onPress={() => register({email, password})}
          text="Register"
        />
      </View>
    </KeyboardAvoidingView>
  ) : (
    // View with account info for users who are already logged in.
    <View style={styles.container}>
      <Icon name="alpha-n" color={colors.red} size={200} style={styles.logo} />
      <View style={styles.accountInfo}>
        <Text style={styles.accountInfoName}>Email:</Text>
        <Text style={styles.accountInfoValue}>{registeredEmail}</Text>
      </View>
      <Button
        disabled={result.pending}
        isPrimary
        onPress={logOut}
        text="Log Out"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  logo: {
    marginTop: 50,
  },
  input: {
    width: '90%',
    height: 40,
    marginTop: 40,
    borderBottomWidth: 2,
    borderBottomColor: colors.grayDark,
    color: colors.white,
  },
  errorContainer: {
    width: '90%',
    minHeight: 55,
    flexDirection: 'row',
    flexShrink: 1,
    paddingVertical: 10,
  },
  error: {
    color: colors.red,
  },
  buttons: {
    marginTop: 20,
    flexDirection: 'row',
  },
  accountInfo: {
    marginTop: 100,
    marginBottom: 40,
    flexDirection: 'row',
  },
  accountInfoName: {
    marginRight: 5,
    color: colors.grayDark,
  },
  accountInfoValue: {
    color: colors.white,
  },
});
