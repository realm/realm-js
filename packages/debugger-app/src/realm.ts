import { createRealmContext } from "@realm/react";

export class AppConfig extends Realm.Object {
  appId!: string;
  baseUrl?: string;
}

const {
  RealmProvider: DebuggerRealmProvider,
  useRealm: useDebuggerRealm,
  useObject: useDebuggerObject,
  useQuery: useDebuggerQuery,
} = createRealmContext({
  schema: [AppConfig],
});

export { DebuggerRealmProvider, useDebuggerRealm, useDebuggerObject, useDebuggerQuery };
