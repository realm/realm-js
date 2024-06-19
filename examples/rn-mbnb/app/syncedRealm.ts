import { createRealmContext } from "@realm/react";
import { syncedModels } from "./syncedModels";

const { useRealm, useQuery, useObject, RealmProvider } = createRealmContext({
  schema: syncedModels,
});

export {
  useRealm as useSyncedRealm,
  useQuery as useSyncedQuery,
  useObject as useSyncedObject,
  RealmProvider as SyncedRealmProvider,
};
