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

import { FormEvent, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthOperationName, useApp, useEmailPasswordAuth } from '@realm/react';

import logo from '../assets/atlas-app-services.png';
import styles from '../styles/LoginPage.module.css';

/**
 * Screen for registering and/or logging in to the App Services App.
 */
export function LoginPage() {
  const atlasApp = useApp();
  const { register, logIn, result } = useEmailPasswordAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authRequest, setAuthRequest] = useState<'login' | 'register'>('login');

  // Automatically log in the user after successful registration.
  useEffect(() => {
    if (result.operation === AuthOperationName.Register && result.success) {
      logIn({ email, password });
    }
  }, [result.operation, result.success, logIn, email, password]);

  // The `currentUser` will be set after a successful login.
  if (atlasApp.currentUser) {
    return <Navigate to='/tasks' />;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    if (authRequest === 'register') {
      register({ email, password });
    } else {
      logIn({ email, password });
    }
  };

  const handleButtonClicked = (event: FormEvent<HTMLButtonElement>): void => {
    setAuthRequest(event.currentTarget.value as 'login' | 'register');
  };

  return (
    <div className={styles.container}>
      <img
        alt='Atlas Device Sync'
        className={styles.logo}
        src={logo}
      />
      <h1>
      Atlas Device SDK for Web
      </h1>
      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          className={styles.input}
          type='text'
          placeholder='Email'
          value={email}
          onChange={(event) => setEmail(event.currentTarget.value)}
          autoCorrect='off'     // Safari only
          autoCapitalize='none' // Safari only
        />
        <input
          className={styles.input}
          type='password'
          placeholder='Password (min. 6 chars)'
          value={password}
          onChange={(event) => setPassword(event.currentTarget.value)}
        />
        {result.error && (
          <p className={styles.error}>
            {result.error.message}
          </p>
        )}
        <div className={styles.buttons}>
          <button
            className={styles.button}
            type='submit'
            value='login'
            onClick={handleButtonClicked}
          >
            Log In
          </button>
          <button
            className={styles.button}
            type='submit'
            value='register'
            onClick={handleButtonClicked}
          >
            Register
          </button>
        </div>
      </form>
    </div>
  );
}
