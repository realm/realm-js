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

import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import { useAppManager } from '../hooks/useAppManager';
import logo from '../assets/logo.png';
import styles from '../styles/LoginPage.module.css';

const { useApp } = await import('@realm/react');

const PASSWORD_MIN_LENGTH = 6;

export function LoginPage() {
  const atlasApp = useApp();
  const navigate = useNavigate();
  const { register, logIn } = useAppManager();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authRequest, setAuthRequest] = useState<'login' | 'register'>('login');
  const [error, setError] = useState('');

  if (atlasApp.currentUser) {
    return <Navigate to='/tasks' />
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    if (password.length < PASSWORD_MIN_LENGTH) {
      return setError(`Password must contain at least ${PASSWORD_MIN_LENGTH} characters.`);
    }

    try {
      if (authRequest === 'register') {
        await register({ email, password });
      }
      await logIn({ email, password });
    } catch (err: any) {
      const message = `There was an error ${authRequest === 'login' ? 'logging in' : 'registering'}, please try again.`;
      console.error(`${message}\nError: ${err.message || err}`);
      return setError(message);
    }

    navigate('/tasks');
  };

  const handleButtonClicked = (event: FormEvent<HTMLButtonElement>): void => {
    setAuthRequest(event.currentTarget.value as 'login' | 'register');
  };

  return (
    <div className={styles.container}>
      <img
        src={logo}
        alt='Realm by MongoDB'
      />
      <h1>
        Log in to try out Realm Web & Sync
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
          placeholder={`Password (min. ${PASSWORD_MIN_LENGTH} chars)`}
          value={password}
          onChange={(event) => setPassword(event.currentTarget.value)}
        />
        {error && (
          <p className={styles.error}>
            {error}
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
