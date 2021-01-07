import { useCallback } from "react";
import { useApp } from "realm-hooks";
import { Credentials } from "realm-web";

export function LogInForm() {
  const app = useApp();
  const handleAuthenticateAnonymously = useCallback(() => {
    const credentials = Credentials.anonymous();
    app.logIn(credentials);
  }, [app]);
  return (
    <div>
      <button onClick={handleAuthenticateAnonymously}>Authenticate anonymously</button>
    </div>
  );
}
