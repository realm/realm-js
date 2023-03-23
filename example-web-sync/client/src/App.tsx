import React, { useEffect } from "react";

import { getApp } from "./app-services/app";
import useRealm from "./hooks/useRealm";

const app = getApp();

function App() {
  const {
    user,
    syncItems,
    logIn,
    openRealm,
    closeRealm,
  } = useRealm(app);

  useEffect(() => {
    if (!user) {
      logIn();
    }
  }, []); // Don't add `user` to the dependency array.

  useEffect(() => {
    if (!user) {
      return;
    }
    openRealm();

    return closeRealm;
  }, [user]);

  return (
    <div>
      <p>Hello World</p>
      {syncItems && syncItems.map((item) => (
        <p key={item._id.toHexString()}>
          {item._id.toHexString()}
        </p>
      ))}
    </div>
  );
}

export default App;
