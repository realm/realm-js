import { useApp, useAuth } from "@realm/react"
import React, { useEffect } from "react"
import {Text} from "react-native"

export const AnonAuth = () => {
  const atlasApp = useApp();
  const {result, logInWithAnonymous} = useAuth();

  useEffect(() => {
    // Log in as an anonymous user if there is not a logged in user yet. Also
    // check `!result.pending` to prevent simultaneous authentication operations.
    if (!atlasApp.currentUser && !result.pending) {
      logInWithAnonymous();
    }
  }, [atlasApp.currentUser, result.pending, logInWithAnonymous]);

  return <Text>Logging in</Text>
}
