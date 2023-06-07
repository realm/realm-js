import { useCallback } from 'react';
import Realm from 'realm';
const { useApp } = await import('@realm/react');

/**
 * Manages authenticating with an Atlas App.
 */
export function useAppManager() {
  const app = useApp();

  const register = useCallback((credentials: { email: string, password: string }) => {
    console.log('Registering..');
    return app.emailPasswordAuth.registerUser(credentials);
  }, [app.id]);

  const logIn = useCallback((credentials: { email: string, password: string }) => {
    console.log('Logging in..');
    return app.logIn(Realm.Credentials.emailPassword(credentials));
  }, [app.id]);

return { register, logIn };
}
