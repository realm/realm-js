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
import {useDemoAuthOperations} from '../hooks/useDemoAuthOperations';

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
    <View>
      <View style={styles.operations}>
        <View>
          <Text>Register</Text>
          <Button onPress={registerSuccessfully} text="Successfully" />
          <Button
            onPress={registerWithInvalidCredentials}
            text="With invalid password"
          />
          <Button
            onPress={registerWithEmailAlreadyInUse}
            text="With email already in use"
          />
        </View>
        <View>
          <Text>Log In</Text>
          <Button onPress={logInSuccessfully} text="Successfully" />
          <Button
            onPress={logInWithInvalidCredentials}
            text="With invalid password"
          />
          <Button
            onPress={logInWithNonExistentCredentials}
            text="With non-existent email"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  operations: {
    flexDirection: 'row',
  },
});
