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

import {useCallback, useEffect, useMemo, useState} from 'react';
import {Alert} from 'react-native';
import {AuthOperationName, useApp, useEmailPasswordAuth} from '@realm/react';

import {logger} from '../utils/logger';

const VALID_PASSWORD = '123456';

function generateDummyEmail() {
  const prefix = Math.round(Math.random() * 100_000);
  return `${prefix}@email.com`;
}

function getNewValidCredentials() {
  return {
    email: generateDummyEmail(),
    password: VALID_PASSWORD,
  };
}

function getExistingCredentials(registeredEmail: string) {
  return {
    email: registeredEmail,
    password: VALID_PASSWORD,
  };
}

const NON_EXISTENT_CREDENTIALS = {
  email: 'non-existent@email.com',
  password: VALID_PASSWORD,
};

const INVALID_CREDENTIALS = {
  email: 'invalid',
  password: '1',
};

/**
 * Hook for providing functions to trigger various auth operations,
 * such as logging in or registering with valid and invalid credentials.
 *
 * @note
 * These functions are used solely for demoing purposes in order to
 * observe various behavior and error messages.
 */
export function useDemoAuthOperations() {
  const app = useApp();
  const {logIn, register, result} = useEmailPasswordAuth();
  // An email that has been registered but the user has not yet logged
  // in. At that stage, the user status will be pending user login.
  const [pendingEmail, setPendingEmail] = useState<string>();

  const registeredEmail = useMemo(() => {
    return pendingEmail || Object.values(app.allUsers)[0]?.profile.email;
  }, [app.allUsers, pendingEmail]);

  const logAndLogIn = useCallback(
    (credentials: {email: string; password: string}) => {
      logger.info('Logging in...');
      logIn(credentials);
    },
    [logIn],
  );

  const logInSuccessfully = useCallback(() => {
    if (!registeredEmail) {
      return Alert.alert('You need to register a user first.');
    }
    logAndLogIn(getExistingCredentials(registeredEmail));
  }, [registeredEmail, logAndLogIn]);

  const logInWithInvalidCredentials = useCallback(() => {
    logAndLogIn(INVALID_CREDENTIALS);
  }, [logAndLogIn]);

  const logInWithNonExistentCredentials = useCallback(() => {
    logAndLogIn(NON_EXISTENT_CREDENTIALS);
  }, [logAndLogIn]);

  const logAndRegister = useCallback(
    (credentials: {email: string; password: string}) => {
      logger.info('Registering...');
      register(credentials);
    },
    [register],
  );

  const registerSuccessfully = useCallback(() => {
    const validCredentials = getNewValidCredentials();
    setPendingEmail(validCredentials.email);
    logAndRegister(validCredentials);
  }, [logAndRegister]);

  const registerWithInvalidCredentials = useCallback(() => {
    logAndRegister(INVALID_CREDENTIALS);
  }, [logAndRegister]);

  const registerWithEmailAlreadyInUse = useCallback(() => {
    if (!registeredEmail) {
      return Alert.alert('You need to register a user first.');
    }
    logAndRegister(getExistingCredentials(registeredEmail));
  }, [registeredEmail, logAndRegister]);

  useEffect(() => {
    if (result.error) {
      logger.error(
        `Failed operation '${result.operation}': ${result.error.message}`,
      );
    } else if (result.success) {
      logger.info(`Successful operation '${result.operation}'.`);
      // App developers can choose to automatically log in users upon
      // successful registration. Note that the user will only appear in
      // `app.allUsers` once it has logged in for the first time. Between
      // registration and login, the user status will be "Pending User
      // Login" which can be seen in the App Services UI. If the app data
      // on the device is deleted, `app.allUsers` will also be empty.
      if (result.operation === AuthOperationName.Register) {
        logInSuccessfully();
      }
    }
  }, [logInSuccessfully, result]);

  return {
    logInSuccessfully,
    logInWithInvalidCredentials,
    logInWithNonExistentCredentials,
    registerSuccessfully,
    registerWithInvalidCredentials,
    registerWithEmailAlreadyInUse,
  };
}
