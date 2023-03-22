import React, { useEffect, useRef, useState } from "react";
// Temporarily using "realm" package for TS.
import Realm, { ClientResetMode, ConfigurationWithSync, /*Credentials,*/ Results, User } from "realm";

import { getApp } from "./app-services/app";
import { partition } from "./app-services/config.json";
import { SyncItem } from "./models/SyncItem";

const app = getApp();

function App() {
  const [user, setUser] = useState<User | null>(() => app.currentUser);
  const realmRef = useRef<Realm | null>(null);

  // Temporarily saving synced objects to see if it's syncing.
  const [syncItems, setSyncItems] = useState<Results<SyncItem> | null>(null);
  const observableRef = useRef<Results<SyncItem> | null>(null);

  const logIn = async () => {
    try {
      setUser(await app.logIn(Realm.Credentials.anonymous()));
    } catch (err: any) {
      console.error("Error logging in:", err.message);
    }
  };

  // Temporarily fetching objects to see if it's syncing.
  const fetchItems = () => {
    const realm = realmRef.current;
    if (realm) {
      const items = realm.objects(SyncItem);
      items.addListener(() => {
        setSyncItems(realm.objects(SyncItem));
      });
      observableRef.current = items;
      setSyncItems(items);
    }
  };

  const openRealm = async () => {
    try {
      const config: ConfigurationWithSync = {
        schema: [SyncItem],
        sync: {
          user: user!,
          partitionValue: partition,
          clientReset: {
            mode: ClientResetMode.RecoverOrDiscardUnsyncedChanges,
          },
        },
      };
      const realm = await Realm.open(config);
      realmRef.current = realm;

      fetchItems();
    } catch (err: any) {
      console.error("Error opening the realm:", err.message);
    }
  };

  const closeRealm = () => {
    observableRef.current?.removeAllListeners();
    observableRef.current = null;

    const realm = realmRef.current;
    if (!realm?.isClosed) {
      realm?.close();
    }
    realmRef.current = null;
    setUser(null);
  };

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
