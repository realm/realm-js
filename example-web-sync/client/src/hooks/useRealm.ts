import React, { useRef, useState } from "react";
import Realm, { ClientResetMode, ConfigurationWithSync, /*Credentials,*/ Results, User } from "realm";

import config from "../app-services/config.json";
import { SyncItem } from "../models/SyncItem";

const { partition } = config;

function useRealm(app: Realm.App) {
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
    if (realm && !realm.isClosed) {
      realm.close();
    }
    realmRef.current = null;
    setUser(null);
  };

  return {
    user,
    syncItems,
    logIn,
    openRealm,
    closeRealm,
  };
}

export default useRealm;
