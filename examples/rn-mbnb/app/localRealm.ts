import { createRealmContext } from "@realm/react";
import { localModels } from "./localModels";

const { useRealm, useQuery, useObject, RealmProvider } = createRealmContext({
  schema: localModels,
  deleteRealmIfMigrationNeeded: true,
});

export {
  useRealm as useLocalRealm,
  useQuery as useLocalQuery,
  useObject as useLocalObject,
  RealmProvider as LocalRealmProvider,
};
