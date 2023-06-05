import React, { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAppManager } from '../hooks/useAppManager';

export function LoginScreen() {
  const navigate = useNavigate();
  const { register, logIn } = useAppManager();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authRequest, setAuthRequest] = useState<'login' | 'register'>('login')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    try {
      if (authRequest === 'login') {
        await logIn({ email, password });
      } else {
        await register({ email, password });
      }
    } catch (err: any) {
      return console.error(`Error ${authRequest === 'login' ? 'logging in' : 'registering'}: ${err.message || err}`);
    }

    setEmail('');
    setPassword('');
    navigate('/');
  };

  const handleButtonClicked = (event: FormEvent<HTMLButtonElement>): void => {
    setAuthRequest(event.currentTarget.value as 'login' | 'register');
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input
          type='text'
          placeholder='Email'
          value={email}
          onChange={(event) => setEmail(event.currentTarget.value)}
          autoCorrect='off'     // Safari only
          autoCapitalize='none' // Safari only
        />
        <input
          type='password'
          placeholder='Password'
          value={password}
          onChange={(event) => setPassword(event.currentTarget.value)}
        />
        <button type='submit' value='login' onClick={handleButtonClicked}>
          Log In
        </button>
        <button type='submit' value='register' onClick={handleButtonClicked}>
          Register
        </button>
      </form>
    </div>
  );
}
