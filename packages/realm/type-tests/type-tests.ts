////////////////////////////////////////////////////////////////////////////
//
// Copyright 2022 Realm Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
////////////////////////////////////////////////////////////////////////////

import * as Realm from "realm";
import * as next from "next-realm";

/* eslint-disable @typescript-eslint/no-unused-vars */

declare class Person {
  name: string;
  age: number;
}

// Realm constructor

{
  // const realm: lib.Realm = new Realm();
}
{
  type IncompatibleProps =
    // This is now @internal
    | "_updateSchema"
    // The syncSession.config.initialSubscriptions.update takes a Realm (which doesn't exactly match yet)
    | "syncSession"
    // The callback takes a Realm (which doesn't exactly match yet)
    | "addListener"
    | "removeListener"
    // This method takes a config, which are slightly different - which will be tested in another test
    | "writeCopyTo";
  /*
   */
  type OldRealm = Omit<Realm, IncompatibleProps>;
  type NextRealm = Omit<next.Realm, IncompatibleProps>;
  const nextRealm = {} as NextRealm;
  const oldRealm: OldRealm = nextRealm;
}
{
  type OldRealmConfiguration = Realm.Configuration;
  type NextRealmConfiguration = next.Realm.Configuration;
  const nextConfig = {} as NextRealmConfiguration;
  const oldConfig: OldRealmConfiguration = nextConfig;
}

/*
{
  const config: Realm.Configuration = {} as lib.Configuration;
}
{
  const realm = new lib.Realm();
  const object: lib.Object = realm.objectForPrimaryKey("Person", "alice");
}

{
  const object: Realm.Object<Person> = null as unknown as lib.Object<Person>;
}

{
  const results: Realm.Results<Person> = null as unknown as lib.Results<Person>;
}

{
  const list: Realm.List<Person> = null as unknown as lib.List<Person>;
}

{
  type T = { foo: string; bar: number };
  const dict: Realm.Dictionary<Person> = null as unknown as lib.Dictionary<Person>;
}

{
  const app: Realm.App = null as unknown as lib.App;
}

{
  const user: Realm.User = null as unknown as lib.User;
}
*/
