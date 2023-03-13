////////////////////////////////////////////////////////////////////////////
//
// Copyright 2023 Realm Inc.
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

import {
  BSON,
  CanonicalObjectSchema,
  ClassHelpers,
  Constructor,
  DefaultObject,
  Dictionary,
  JSONCacheMap,
  ObjectChangeCallback,
  ObjectListeners,
  OrderedCollection,
  Realm,
  RealmInsertionModel,
  RealmObjectConstructor,
  Results,
  assert,
  binding,
  flags,
  getTypeName,
} from "./internal";

const INTERNAL = Symbol("Object#internal");

export class Counter {

  /**
   * @internal
   * The object's representation in the binding.
   */
    public declare readonly         [INTERNAL]: binding.Obj;


  readonly value: number;
  readonly columnKey: number = 23; //TODO Probably this needs to be something else
  //TODO We need to pass also the handle here probably

  constructor(value: number) {
    this.value = value;
  }

  increment(val: number): Counter {
    return new Counter(this.value + val); //This will actually write in the db too
    //This depends on the fact if the counter is considered readonly or not
  }

  decrement(val: number): Counter {

    return new Counter(this.value - val);

  }

  static with(value: number) {
    return new Counter(value);
  }

  /**
   * TODO 
   * - Find out why the linter does not work...
   * - Check what api I can use to call increment/decrement
   * - Modify the schema to accept this new type
   * - When accessing properties on an object, change return type depending on schema definition 
   * 
   * 
   */
}

const MyClassSchema: Realm.ObjectSchema = {
  name: "Person",
  properties: {
    counter: "Counter",
  },
};

export class MyClass extends Realm.Object {
  counter!: Counter;
  static schema: Realm.ObjectSchema = MyClassSchema;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function example() {
  const realm = await Realm.open({ schema: [MyClass] });

  const ob = realm.write(() => {
    return realm.create<MyClass>(MyClassSchema.name, {
      counter: Counter.with(23),
    });
  });

  ob.counter.increment(2);

  // eslint-disable-next-line no-console
  console.log(ob.counter.value);
}
