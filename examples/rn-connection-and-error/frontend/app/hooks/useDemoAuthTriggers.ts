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

import {getIntBetween} from '../utils/random';
import {logger} from '../utils/logger';

type EmailPasswordCredentials = {
  email: string;
  password: string;
};

const VALID_PASSWORD = '123456';

function generateDummyEmail(): string {
  return `${getIntBetween(0, 100_000)}@email.com`;
}

function getNewValidCredentials(): EmailPasswordCredentials {
  return {
    email: generateDummyEmail(),
    password: VALID_PASSWORD,
  };
}

function getExistingCredentials(
  registeredEmail: string,
): EmailPasswordCredentials {
  return {
    email: registeredEmail,
    password: VALID_PASSWORD,
  };
}

const NON_EXISTENT_CREDENTIALS: EmailPasswordCredentials = {
  email: 'non-existent@email.com',
  password: VALID_PASSWORD,
};

const INVALID_CREDENTIALS: EmailPasswordCredentials = {
  email: 'invalid',
  password: '1',
};

/**
 * Hook for providing functions to trigger various auth operations,
 * such as logging in or registering with valid and invalid credentials.
 *
 * @note
 * These functions are used solely for demo purposes in order to observe
 * various behavior and error messages.
 */
export function useDemoAuthTriggers() {
  const app = useApp();
  const {logIn, register, result} = useEmailPasswordAuth();
  // An email that has been registered but the user has not yet logged in.
  const [pendingEmail, setPendingEmail] = useState<string>();

  const registeredEmail = useMemo(() => {
    // The user will only appear in `app.allUsers` once it has logged in
    // for the first time. Between registration and login, the user status
    // will be "Pending User Login" which can be seen in the App Services UI.
    // If the app is restarted while the user is logged out, `app.allUsers`
    // will be empty on startup.
    const allUsers = Object.values(app.allUsers);
    return pendingEmail || allUsers[allUsers.length - 1]?.profile.email;
  }, [app.allUsers, pendingEmail]);

  /**
   * Logs a message using a preferred logging mechanism before
   * proceeding to log in the user to the App.
   */
  const logAndLogIn = useCallback(
    (credentials: EmailPasswordCredentials) => {
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

  /**
   * Logs a message using a preferred logging mechanism before
   * proceeding to register the user to the App.
   */
  const logAndRegister = useCallback(
    (credentials: EmailPasswordCredentials) => {
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
    // We show an alert on the screen when a user has been registered. For your own
    // app, developers can choose to automatically log in users upon successful
    // registration using this pattern as well. Instead of showing an alert, you can
    // then call your log in method. (For this app, it would be `logInSuccessfully()`.)
    if (result.operation === AuthOperationName.Register && result.success) {
      Alert.alert('🥳 You are now registered and can log in!');
    }
  }, [result]);

  return {
    logInSuccessfully,
    logInWithInvalidCredentials,
    logInWithNonExistentCredentials,
    registerSuccessfully,
    registerWithInvalidCredentials,
    registerWithEmailAlreadyInUse,
  };
}
