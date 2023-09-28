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
import {StyleSheet, Text, View} from 'react-native';

import {Button} from '../components/Button';
import {colors} from '../styles/colors';
import {fonts} from '../styles/fonts';
import {useDemoAuthOperations} from '../hooks/useDemoAuthOperations';

/**
 * Screen for registering and/or logging in to the App Services App.
 */
export function LoginScreen() {
  const {
    logInSuccessfully,
    logInWithInvalidCredentials,
    logInWithNonExistentCredentials,
    registerSuccessfully,
    registerWithInvalidCredentials,
    registerWithEmailAlreadyInUse,
  } = useDemoAuthOperations();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Demo</Text>
        <Text style={styles.subtitle}>
          Detect and react to various changes in connection state, user state,
          sync errors, and product inventory.
        </Text>
        <Text style={styles.info}>
          🖥️ Observe your console while using this demo.
        </Text>
      </View>
      <View style={styles.main}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Register</Text>
          <Button
            extraStyles={[styles.button]}
            onPress={registerSuccessfully}
            text="Successfully"
          />
          <Button
            extraStyles={[styles.button]}
            onPress={registerWithInvalidCredentials}
            text="With invalid password"
          />
          <Button
            extraStyles={[styles.button]}
            onPress={registerWithEmailAlreadyInUse}
            text="With email already in use"
          />
        </View>
        <View style={styles.separator} />
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Log In</Text>
          <Button
            extraStyles={[styles.button]}
            onPress={logInSuccessfully}
            text="Successfully"
          />
          <Button
            extraStyles={[styles.button]}
            onPress={logInWithInvalidCredentials}
            text="With invalid password"
          />
          <Button
            extraStyles={[styles.button]}
            onPress={logInWithNonExistentCredentials}
            text="With non-existent email"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.grayLight,
  },
  header: {
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderColor: colors.grayMedium,
    backgroundColor: colors.white,
  },
  title: {
    textAlign: 'center',
    fontFamily: fonts.primary,
    fontSize: 20,
  },
  subtitle: {
    marginVertical: 10,
    textAlign: 'center',
    fontFamily: fonts.primary,
    fontSize: 16,
    fontWeight: 'normal',
  },
  info: {
    textAlign: 'center',
    fontStyle: 'italic',
    color: colors.grayDark,
  },
  main: {
    marginTop: 20,
  },
  section: {
    marginVertical: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    marginBottom: 20,
    fontSize: 16,
    fontWeight: 'bold',
  },
  separator: {
    height: 1,
    backgroundColor: colors.grayMedium,
  },
  button: {
    marginVertical: 10,
  },
});
