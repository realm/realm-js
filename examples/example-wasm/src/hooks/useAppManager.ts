import { useCallback } from 'react';
import Realm from 'realm';

const { useApp } = await import('@realm/react');

/**
 * Manages authenticating with an Atlas App.
 */
export function useAppManager() {
  const app = useApp();

  const register = useCallback((credentials: { email: string, password: string }) => {
    return app.emailPasswordAuth.registerUser(credentials);
  }, [app.id]);

  const logIn = useCallback((credentials: { email: string, password: string }) => {
    return app.logIn(Realm.Credentials.emailPassword(credentials));
  }, [app.id]);

  return { register, logIn };
}
