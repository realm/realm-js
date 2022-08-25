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

import "../../..";
import * as lib from "../src";

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
  const realm: Realm = new lib.Realm();
}
{
  const config: lib.Configuration = {} as Realm.Configuration;
}
{
  const config: Realm.Configuration = {} as lib.Configuration;
}
{
  const realm = new lib.Realm();
  const object: lib.Object = realm.objectForPrimaryKey("Person", "alice");
}

// Realm.Object

{
  const object: Realm.Object<Person> = null as unknown as lib.Object<Person>;
}

// Realm.Result

{
  const results: Realm.Results<Person> = null as unknown as lib.Results<Person>;
}

// List
{
  const list: Realm.List<Person> = null as unknown as lib.List<Person>;
}

// Dictionary
{
  type T = { foo: string; bar: number };
  const dict: Realm.Dictionary<Person> = null as unknown as lib.Dictionary<Person>;
}
