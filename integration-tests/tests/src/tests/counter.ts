////////////////////////////////////////////////////////////////////////////
//
// Copyright 2024 Realm Inc.
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

import { expect } from "chai";
import Realm, { Counter, ObjectSchema } from "realm";

import { openRealmBeforeEach } from "../hooks";
import { expectRealmDictionary, expectRealmList, expectRealmSet } from "../utils/expects";

interface IWithCounter {
  counter: Counter;
}

const WithCounterSchema: ObjectSchema = {
  name: "WithCounter",
  properties: {
    counter: "counter",
  },
};

interface IWithNullableCounter {
  nullableCounter?: Counter | null;
}

const WithNullableCounterSchema: ObjectSchema = {
  name: "WithNullableCounter",
  properties: {
    nullableCounter: "counter?",
    // TODO(lj): Add a 'listOfNullableCounters'?
  },
};

interface IWithDefaultCounter {
  counterWithDefault: Counter;
}

const WithDefaultCounterSchema: ObjectSchema = {
  name: "WithDefaultCounter",
  properties: {
    counterWithDefault: { type: "int", presentation: "counter", default: 0 },
  },
};

interface IWithCounterCollections {
  list: Realm.List<Counter>;
  dictionary: Realm.Dictionary<Counter>;
  set: Realm.Set<Counter>;
}

const WithCounterCollectionsSchema: ObjectSchema = {
  name: "WithCounterCollections",
  properties: {
    list: "counter[]",
    dictionary: "counter{}",
    set: "counter<>",
  },
};

interface IWithRegularInt {
  int: number;
}

const WithRegularIntSchema: ObjectSchema = {
  name: "WithRegularInt",
  properties: {
    int: "int",
  },
};

interface IWithMixed {
  mixed: Realm.Types.Mixed;
  list: Realm.List<Realm.Types.Mixed>;
  dictionary: Realm.Dictionary<Realm.Types.Mixed>;
  set: Realm.Set<Realm.Types.Mixed>;
}

const WithMixedSchema: ObjectSchema = {
  name: "WithMixed",
  properties: {
    mixed: "mixed",
    list: "mixed[]",
    dictionary: "mixed{}",
    set: "mixed<>",
  },
};

function expectCounter(value: unknown): asserts value is Counter {
  expect(value).to.be.instanceOf(Counter);
}

function expectKeys(dictionary: Realm.Dictionary, keys: string[]) {
  expect(Object.keys(dictionary)).members(keys);
}

function expectRealmListOfCounters(
  actual: unknown,
  expectedCounts: readonly number[],
): asserts actual is Realm.List<Counter> {
  expectRealmList(actual);
  expect(actual.length).equals(expectedCounts.length);

  for (let i = 0; i < actual.length; i++) {
    const counter = actual[i];
    expectCounter(counter);
    expect(counter.value).equals(expectedCounts[i]);
  }
}

function expectRealmDictionaryOfCounters(
  actual: unknown,
  expectedCounts: Record<string, number>,
): asserts actual is Realm.Dictionary<Counter> {
  expectRealmDictionary(actual);
  expectKeys(actual, Object.keys(expectedCounts));

  for (const key in actual) {
    const counter = actual[key];
    expectCounter(counter);
    expect(counter.value).equals(expectedCounts[key]);
  }
}

function expectRealmSetOfCounters(
  actual: unknown,
  expectedCounts: readonly number[],
): asserts actual is Realm.Set<Counter> {
  expectRealmSet(actual);
  const size = actual.size;
  expect(size).equals(expectedCounts.length);

  for (let i = 0; i < size; i++) {
    const counter = actual[i];
    expectCounter(counter);
    expect(counter.value).equals(expectedCounts[i]);
  }
}

describe("Counter", () => {
  openRealmBeforeEach({
    schema: [
      WithCounterSchema,
      WithNullableCounterSchema,
      WithCounterCollectionsSchema,
      WithDefaultCounterSchema,
      WithRegularIntSchema,
      WithMixedSchema,
    ],
  });

  const initialValuesList = [-100, 0, 1.0, 1000] as const;
  const initialValuesDict: Readonly<Record<string, number>> = {
    negative100: -100,
    _0: 0,
    _1: 1.0,
    _1000: 1000,
  };

  describe("Create and access", () => {
    describe("Via 'realm.create()'", () => {
      it("can create and access (input: number)", function (this: RealmContext) {
        for (let i = 0; i < initialValuesList.length; i++) {
          const input = initialValuesList[i];
          const { counter } = this.realm.write(() => {
            return this.realm.create<IWithCounter>(WithCounterSchema.name, {
              counter: input,
            });
          });

          const expectedNumObjects = i + 1;
          expect(this.realm.objects(WithCounterSchema.name).length).equals(expectedNumObjects);
          expectCounter(counter);
          expect(counter.value).equals(input);
        }
      });

      it("can create and access (input: Counter)", function (this: RealmContext) {
        const initialNumValues = initialValuesList;
        const initialCounterValues: Counter[] = [];

        // First create Realm objects with counters.
        this.realm.write(() => {
          for (const input of initialNumValues) {
            const { counter } = this.realm.create<IWithCounter>(WithCounterSchema.name, {
              counter: input,
            });
            expectCounter(counter);
            expect(counter.value).equals(input);

            initialCounterValues.push(counter);
          }
        });

        // Use the managed Counters as input, each in a separate transaction.
        for (let i = 0; i < initialCounterValues.length; i++) {
          const input = initialCounterValues[i];
          const { counter } = this.realm.write(() => {
            return this.realm.create<IWithCounter>(WithCounterSchema.name, {
              counter: input,
            });
          });

          const expectedNumObjects = initialNumValues.length + i + 1;
          expect(this.realm.objects(WithCounterSchema.name).length).equals(expectedNumObjects);
          expectCounter(counter);
          expect(counter.value).equals(input.value);
        }
      });

      it("can create and access (input: default value)", function (this: RealmContext) {
        const { counterWithDefault } = this.realm.write(() => {
          // Pass an empty object in order to use the default value from the schema.
          return this.realm.create<IWithDefaultCounter>(WithDefaultCounterSchema.name, {});
        });

        expect(this.realm.objects(WithDefaultCounterSchema.name).length).equals(1);
        expectCounter(counterWithDefault);
        expect(counterWithDefault.value).equals(0);
      });

      it("can create optional counter with int or null", function (this: RealmContext) {
        const { counter1, counter2 } = this.realm.write(() => {
          const counter1 = this.realm.create<IWithNullableCounter>(WithNullableCounterSchema.name, {
            nullableCounter: 0,
          }).nullableCounter;

          const counter2 = this.realm.create<IWithNullableCounter>(WithNullableCounterSchema.name, {
            nullableCounter: null,
          }).nullableCounter;

          return { counter1, counter2 };
        });

        expect(this.realm.objects(WithNullableCounterSchema.name).length).equals(2);
        expectCounter(counter1);
        expect(counter1.value).equals(0);
        expect(counter2).to.be.null;
      });

      // TODO(lj): To be implemented.
      it.skip("can create and access list (input: number[])", function (this: RealmContext) {
        const { list } = this.realm.write(() => {
          return this.realm.create<IWithCounterCollections>(WithCounterCollectionsSchema.name, {
            list: initialValuesList,
          });
        });

        expect(this.realm.objects(WithCounterCollectionsSchema.name).length).equals(1);
        expectRealmListOfCounters(list, initialValuesList);
      });

      // TODO(lj): To be implemented.
      it.skip("can create and access dictionary (input: JS Object)", function (this: RealmContext) {
        const { dictionary } = this.realm.write(() => {
          return this.realm.create<IWithCounterCollections>(WithCounterCollectionsSchema.name, {
            dictionary: initialValuesDict,
          });
        });

        expect(this.realm.objects(WithCounterCollectionsSchema.name).length).equals(1);
        expectRealmDictionaryOfCounters(dictionary, initialValuesDict);
      });

      // TODO(lj): To be implemented.
      it.skip("can create and access set (input: number[])", function (this: RealmContext) {
        const { set } = this.realm.write(() => {
          return this.realm.create<IWithCounterCollections>(WithCounterCollectionsSchema.name, {
            set: initialValuesList,
          });
        });

        expect(this.realm.objects(WithCounterCollectionsSchema.name).length).equals(1);
        expectRealmSetOfCounters(set, initialValuesList);
      });

      it("returns different reference for each access", function (this: RealmContext) {
        const object = this.realm.write(() => {
          return this.realm.create<IWithCounter>(WithCounterSchema.name, {
            counter: 0,
          });
        });

        expectCounter(object.counter);
        // @ts-expect-error Testing different types.
        expect(object.counter === 0).to.be.false;
        expect(object.counter === object.counter).to.be.false;
        expect(Object.is(object.counter, object.counter)).to.be.false;
      });
    });

    // TODO(lj): To be implemented.
    describe.skip("Via collection accessors", () => {
      it("can create and access list items", function (this: RealmContext) {
        const { list } = this.realm.write(() => {
          return this.realm.create<IWithCounterCollections>(WithCounterCollectionsSchema.name, {
            list: [],
          });
        });
        expect(this.realm.objects(WithCounterCollectionsSchema.name).length).equals(1);
        expect(list.length).equals(0);

        this.realm.write(() => {
          list.push(...initialValuesList);
        });

        expectRealmListOfCounters(list, initialValuesList);
      });

      it("can create and access dictionary entries", function (this: RealmContext) {
        const { dictionary } = this.realm.write(() => {
          return this.realm.create<IWithCounterCollections>(WithCounterCollectionsSchema.name, {
            dictionary: {},
          });
        });
        expect(this.realm.objects(WithCounterCollectionsSchema.name).length).equals(1);
        expect(Object.keys(dictionary).length).equals(0);

        this.realm.write(() => {
          for (const key in initialValuesDict) {
            dictionary[key] = initialValuesDict[key];
          }
        });

        expectRealmDictionaryOfCounters(dictionary, initialValuesDict);
      });

      it("can create and access set items", function (this: RealmContext) {
        const { set } = this.realm.write(() => {
          return this.realm.create<IWithCounterCollections>(WithCounterCollectionsSchema.name, {
            set: [] as number[],
          });
        });
        expect(this.realm.objects(WithCounterCollectionsSchema.name).length).equals(1);
        expect(set.length).equals(0);

        this.realm.write(() => {
          for (const input of initialValuesList) {
            set.add(input);
          }
        });

        expectRealmSetOfCounters(set, initialValuesList);
      });

      it("returns different reference for each access", function (this: RealmContext) {
        const { list, dictionary, set } = this.realm.write(() => {
          return this.realm.create<IWithCounterCollections>(WithCounterCollectionsSchema.name, {
            list: [0],
            dictionary: { key: 0 },
            set: [0],
          });
        });

        expectCounter(list[0]);
        // @ts-expect-error Testing different types.
        expect(list[0] === 0).to.be.false;
        expect(list[0] === list[0]).to.be.false;
        expect(Object.is(list[0], list[0])).to.be.false;

        expectCounter(dictionary.key);
        // @ts-expect-error Testing different types.
        expect(dictionary.key === 0).to.be.false;
        expect(dictionary.key === dictionary.key).to.be.false;
        expect(Object.is(dictionary.key, dictionary.key)).to.be.false;

        expectCounter(set[0]);
        // @ts-expect-error Testing different types.
        expect(set[0] === 0).to.be.false;
        expect(set[0] === set[0]).to.be.false;
        expect(Object.is(set[0], set[0])).to.be.false;
      });
    });
  });

  describe("Update", () => {
    describe("Counter.value", () => {
      it("increments", function (this: RealmContext) {
        const { counter } = this.realm.write(() => {
          return this.realm.create<IWithCounter>(WithCounterSchema.name, {
            counter: 0,
          });
        });
        expectCounter(counter);
        expect(counter.value).equals(0);

        this.realm.write(() => {
          counter.increment(0.0);
        });
        expect(counter.value).equals(0);

        this.realm.write(() => {
          counter.increment();
        });
        expect(counter.value).equals(1);

        this.realm.write(() => {
          counter.increment(Number(19));
        });
        expect(counter.value).equals(20);

        this.realm.write(() => {
          counter.increment(-20);
        });
        expect(counter.value).equals(0);

        this.realm.write(() => {
          counter.increment();
          counter.increment();
          counter.increment();
        });
        expect(counter.value).equals(3);
      });

      it("decrements", function (this: RealmContext) {
        const { counter } = this.realm.write(() => {
          return this.realm.create<IWithCounter>(WithCounterSchema.name, {
            counter: 0,
          });
        });
        expectCounter(counter);
        expect(counter.value).equals(0);

        this.realm.write(() => {
          counter.decrement(0.0);
        });
        expect(counter.value).equals(0);

        this.realm.write(() => {
          counter.decrement();
        });
        expect(counter.value).equals(-1);

        this.realm.write(() => {
          counter.decrement(Number(19));
        });
        expect(counter.value).equals(-20);

        this.realm.write(() => {
          counter.decrement(-20.0);
        });
        expect(counter.value).equals(0);

        this.realm.write(() => {
          counter.decrement();
          counter.decrement();
          counter.decrement();
        });
        expect(counter.value).equals(-3);
      });

      it("sets", function (this: RealmContext) {
        const { counter } = this.realm.write(() => {
          return this.realm.create<IWithCounter>(WithCounterSchema.name, {
            counter: 0,
          });
        });
        expectCounter(counter);
        expect(counter.value).equals(0);

        this.realm.write(() => {
          counter.set(0.0);
        });
        expect(counter.value).equals(0);

        this.realm.write(() => {
          counter.set(1);
        });
        expect(counter.value).equals(1);

        this.realm.write(() => {
          counter.set(20.0);
        });
        expect(counter.value).equals(20);

        this.realm.write(() => {
          counter.set(100_000);
        });
        expect(counter.value).equals(100_000);

        this.realm.write(() => {
          counter.set(1);
          counter.set(2);
          counter.set(3);
        });
        expect(counter.value).equals(3);
      });
    });

    describe("Realm object counter property", () => {
      it("updates", function (this: RealmContext) {
        const object = this.realm.write(() => {
          return this.realm.create<IWithNullableCounter>(WithNullableCounterSchema.name, {
            nullableCounter: 0,
          });
        });
        expectCounter(object.nullableCounter);

        this.realm.write(() => {
          object.nullableCounter = null;
        });
        expect(object.nullableCounter).to.be.null;

        this.realm.write(() => {
          object.nullableCounter = 1;
        });
        expectCounter(object.nullableCounter);
        expect(object.nullableCounter.value).equals(1);

        this.realm.write(() => {
          object.nullableCounter = null;
        });
        expect(object.nullableCounter).to.be.null;

        this.realm.write(() => {
          object.nullableCounter = -100_000;
        });
        expectCounter(object.nullableCounter);
        expect(object.nullableCounter.value).equals(-100_000);
      });
    });

    // TODO(lj): To be implemented.
    describe.skip("Realm object collection of counters property", () => {
      it("updates list", function (this: RealmContext) {
        let input = [-1, 0, 1, 100_000];
        const object = this.realm.write(() => {
          return this.realm.create<IWithCounterCollections>(WithCounterCollectionsSchema.name, {
            list: input,
          });
        });
        expectRealmListOfCounters(object.list, input);

        input = [2, 10];
        this.realm.write(() => {
          object.list = input;
        });
        expectRealmListOfCounters(object.list, input);

        input = [];
        this.realm.write(() => {
          object.list = input;
        });
        expectRealmListOfCounters(object.list, input);
      });

      it("updates dictionary", function (this: RealmContext) {
        let input: Record<string, number> = { a: -1, b: 0, c: 1, d: 100_000 };
        const object = this.realm.write(() => {
          return this.realm.create<IWithCounterCollections>(WithCounterCollectionsSchema.name, {
            dictionary: input,
          });
        });
        expectRealmDictionaryOfCounters(object.dictionary, input);

        input = { a: 2, b: 10 };
        this.realm.write(() => {
          object.dictionary = input;
        });
        expectRealmDictionaryOfCounters(object.dictionary, input);

        input = {};
        this.realm.write(() => {
          object.dictionary = input;
        });
        expectRealmDictionaryOfCounters(object.dictionary, input);
      });

      it("updates set", function (this: RealmContext) {
        let input = [-1, 0, 1, 100_000];
        const object = this.realm.write(() => {
          return this.realm.create<IWithCounterCollections>(WithCounterCollectionsSchema.name, {
            set: input,
          });
        });
        expectRealmSetOfCounters(object.set, input);

        input = [2, 10];
        this.realm.write(() => {
          object.set = input;
        });
        expectRealmSetOfCounters(object.set, input);

        input = [];
        this.realm.write(() => {
          object.set = input;
        });
        expectRealmSetOfCounters(object.set, input);
      });
    });
  });

  describe("Invalid operations", () => {
    it("throws when incrementing by non-integer", function (this: RealmContext) {
      const { counter } = this.realm.write(() => {
        return this.realm.create<IWithCounter>(WithCounterSchema.name, {
          counter: 10,
        });
      });
      expectCounter(counter);
      expect(counter.value).equals(10);

      expect(() => {
        this.realm.write(() => {
          counter.increment(1.1);
        });
      }).to.throw("Expected 'by' to be an integer, got a floating point number");
      expect(counter.value).equals(10);

      expect(() => {
        this.realm.write(() => {
          counter.increment(NaN);
        });
      }).to.throw("Expected 'by' to be an integer, got NaN");
      expect(counter.value).equals(10);

      expect(() => {
        this.realm.write(() => {
          // @ts-expect-error Testing incorrect type.
          counter.increment(new Number(1));
        });
      }).to.throw("Expected 'by' to be an integer, got an instance of Number");
      expect(counter.value).equals(10);

      expect(() => {
        this.realm.write(() => {
          // @ts-expect-error Testing incorrect type.
          counter.increment("1");
        });
      }).to.throw("Expected 'by' to be an integer, got a string");
      expect(counter.value).equals(10);

      expect(() => {
        this.realm.write(() => {
          // @ts-expect-error Testing incorrect type.
          counter.increment(BigInt(1));
        });
      }).to.throw("Expected 'by' to be an integer, got a bigint");
      expect(counter.value).equals(10);
    });

    it("throws when decrementing by non-integer", function (this: RealmContext) {
      const { counter } = this.realm.write(() => {
        return this.realm.create<IWithCounter>(WithCounterSchema.name, {
          counter: 10,
        });
      });
      expectCounter(counter);
      expect(counter.value).equals(10);

      expect(() => {
        this.realm.write(() => {
          counter.decrement(1.1);
        });
      }).to.throw("Expected 'by' to be an integer, got a floating point number");
      expect(counter.value).equals(10);

      expect(() => {
        this.realm.write(() => {
          counter.decrement(NaN);
        });
      }).to.throw("Expected 'by' to be an integer, got NaN");
      expect(counter.value).equals(10);

      expect(() => {
        this.realm.write(() => {
          // @ts-expect-error Testing incorrect type.
          counter.decrement(new Number(1));
        });
      }).to.throw("Expected 'by' to be an integer, got an instance of Number");
      expect(counter.value).equals(10);

      expect(() => {
        this.realm.write(() => {
          // @ts-expect-error Testing incorrect type.
          counter.decrement("1");
        });
      }).to.throw("Expected 'by' to be an integer, got a string");
      expect(counter.value).equals(10);

      expect(() => {
        this.realm.write(() => {
          // @ts-expect-error Testing incorrect type.
          counter.decrement(BigInt(1));
        });
      }).to.throw("Expected 'by' to be an integer, got a bigint");
      expect(counter.value).equals(10);
    });

    it("throws when setting to non-integer", function (this: RealmContext) {
      const { counter } = this.realm.write(() => {
        return this.realm.create<IWithCounter>(WithCounterSchema.name, {
          counter: 10,
        });
      });
      expectCounter(counter);
      expect(counter.value).equals(10);

      expect(() => {
        this.realm.write(() => {
          counter.set(1.1);
        });
      }).to.throw("Expected 'value' to be an integer, got a floating point number");
      expect(counter.value).equals(10);

      expect(() => {
        this.realm.write(() => {
          counter.set(NaN);
        });
      }).to.throw("Expected 'value' to be an integer, got NaN");
      expect(counter.value).equals(10);

      expect(() => {
        this.realm.write(() => {
          // @ts-expect-error Testing incorrect type.
          counter.set(new Number(1));
        });
      }).to.throw("Expected 'value' to be an integer, got an instance of Number");
      expect(counter.value).equals(10);

      expect(() => {
        this.realm.write(() => {
          // @ts-expect-error Testing incorrect type.
          counter.set("1");
        });
      }).to.throw("Expected 'value' to be an integer, got a string");
      expect(counter.value).equals(10);

      expect(() => {
        this.realm.write(() => {
          // @ts-expect-error Testing incorrect type.
          counter.set(BigInt(1));
        });
      }).to.throw("Expected 'value' to be an integer, got a bigint");
      expect(counter.value).equals(10);
    });

    it("throws when updating outside write transaction", function (this: RealmContext) {
      const { counter } = this.realm.write(() => {
        return this.realm.create<IWithCounter>(WithCounterSchema.name, {
          counter: 10,
        });
      });
      expectCounter(counter);
      expect(counter.value).equals(10);

      expect(() => {
        counter.increment();
      }).to.throw("Cannot modify managed objects outside of a write transaction.");
      expect(counter.value).equals(10);

      expect(() => {
        counter.decrement();
      }).to.throw("Cannot modify managed objects outside of a write transaction.");
      expect(counter.value).equals(10);

      expect(() => {
        counter.set(1);
      }).to.throw("Cannot modify managed objects outside of a write transaction.");
      expect(counter.value).equals(10);
    });

    it("throws when setting a non-nullable Realm object counter property", function (this: RealmContext) {
      const object = this.realm.write(() => {
        return this.realm.create<IWithCounter>(WithCounterSchema.name, {
          counter: 10,
        });
      });
      const counter = object.counter;
      expectCounter(counter);
      expect(counter.value).equals(10);

      expect(() => {
        this.realm.write(() => {
          object.counter = 0;
        });
      }).to.throw(
        "You can only directly reset a Counter instance when initializing a previously null Counter or resetting a nullable Counter to null. To update the value of the Counter, use its instance methods",
      );
      expect(object.counter.value).equals(10);

      expect(() => {
        this.realm.write(() => {
          // @ts-expect-error Testing incorrect type.
          object.counter = null;
        });
      }).to.throw(
        "You can only directly reset a Counter instance when initializing a previously null Counter or resetting a nullable Counter to null. To update the value of the Counter, use its instance methods",
      );
      expect(object.counter.value).equals(10);
    });

    it("throws when setting a nullable Realm object counter property from number -> number", function (this: RealmContext) {
      const object = this.realm.write(() => {
        return this.realm.create<IWithNullableCounter>(WithNullableCounterSchema.name, {
          nullableCounter: 10,
        });
      });
      const counter = object.nullableCounter;
      expectCounter(counter);
      expect(counter.value).equals(10);

      expect(() => {
        this.realm.write(() => {
          object.nullableCounter = 0;
        });
      }).to.throw(
        "You can only directly reset a Counter instance when initializing a previously null Counter or resetting a nullable Counter to null. To update the value of the Counter, use its instance methods",
      );
      expect(object.nullableCounter.value).equals(10);
    });

    it("throws when setting an int property to a counter", function (this: RealmContext) {
      const { objectWithInt, counter } = this.realm.write(() => {
        const objectWithInt = this.realm.create<IWithRegularInt>(WithRegularIntSchema.name, {
          int: 10,
        });
        // Create and object with a counter that will be used for setting an 'int' property.
        const { counter } = this.realm.create<IWithCounter>(WithCounterSchema.name, {
          counter: 20,
        });
        return { objectWithInt, counter };
      });
      expectCounter(counter);
      expect(counter.value).equals(20);
      expect(objectWithInt.int).equals(10);

      expect(() => {
        this.realm.write(() => {
          // @ts-expect-error Testing incorrect type.
          objectWithInt.int = counter;
        });
      }).to.throw("Counters can only be used when 'counter' is declared in the property schema");
      expect(objectWithInt.int).equals(10);
    });

    it("throws when getting the count on an invalidated obj", function (this: RealmContext) {
      const object = this.realm.write(() => {
        return this.realm.create<IWithCounter>(WithCounterSchema.name, {
          counter: 10,
        });
      });
      const counter = object.counter;
      expectCounter(counter);
      expect(counter.value).equals(10);
      expect(this.realm.objects(WithCounterSchema.name).length).equals(1);

      this.realm.write(() => {
        this.realm.delete(object);
      });
      expect(this.realm.objects(WithCounterSchema.name).length).equals(0);

      expect(() => counter.value).to.throw("Accessing object which has been invalidated or deleted");
    });

    it("throws when setting a mixed to a counter via object creation", function (this: RealmContext) {
      const { counter } = this.realm.write(() => {
        return this.realm.create<IWithCounter>(WithCounterSchema.name, {
          counter: 10,
        });
      });
      expectCounter(counter);
      expect(counter.value).equals(10);

      expect(() => {
        this.realm.write(() => {
          this.realm.create<IWithMixed>(WithMixedSchema.name, { mixed: counter });
        });
      }).to.throw("Using a Counter as a Mixed value is not supported");
      expect(this.realm.objects(WithMixedSchema.name).length).equals(0);
    });

    it("throws when setting a mixed to a counter via object setter", function (this: RealmContext) {
      const { counter, objectWithMixed } = this.realm.write(() => {
        const counter = this.realm.create<IWithCounter>(WithCounterSchema.name, {
          counter: 10,
        }).counter;
        const objectWithMixed = this.realm.create<IWithMixed>(WithMixedSchema.name, { mixed: 20 });

        return { counter, objectWithMixed };
      });
      expectCounter(counter);
      expect(counter.value).equals(10);

      expect(() => {
        this.realm.write(() => {
          objectWithMixed.mixed = counter;
        });
      }).to.throw("Using a Counter as a Mixed value is not supported");
      expect(objectWithMixed.mixed).equals(20);
    });

    it("throws when adding a counter to mixed collections via object creation", function (this: RealmContext) {
      const { counter } = this.realm.write(() => {
        return this.realm.create<IWithCounter>(WithCounterSchema.name, {
          counter: 10,
        });
      });
      expectCounter(counter);
      expect(counter.value).equals(10);

      expect(() => {
        this.realm.write(() => {
          this.realm.create<IWithMixed>(WithMixedSchema.name, { list: [counter] });
        });
      }).to.throw("Using a Counter as a Mixed value is not supported");
      expect(this.realm.objects(WithMixedSchema.name).length).equals(0);

      expect(() => {
        this.realm.write(() => {
          this.realm.create<IWithMixed>(WithMixedSchema.name, { dictionary: { key: counter } });
        });
      }).to.throw("Using a Counter as a Mixed value is not supported");
      expect(this.realm.objects(WithMixedSchema.name).length).equals(0);

      expect(() => {
        this.realm.write(() => {
          this.realm.create<IWithMixed>(WithMixedSchema.name, { set: [counter] });
        });
      }).to.throw("Using a Counter as a Mixed value is not supported");
      expect(this.realm.objects(WithMixedSchema.name).length).equals(0);

      expect(() => {
        this.realm.write(() => {
          this.realm.create<IWithMixed>(WithMixedSchema.name, { mixed: [counter] });
        });
      }).to.throw("Using a Counter as a Mixed value is not supported");
      expect(this.realm.objects(WithMixedSchema.name).length).equals(0);

      expect(() => {
        this.realm.write(() => {
          this.realm.create<IWithMixed>(WithMixedSchema.name, { mixed: { key: counter } });
        });
      }).to.throw("Using a Counter as a Mixed value is not supported");
      expect(this.realm.objects(WithMixedSchema.name).length).equals(0);
    });

    it("throws when adding a counter to mixed collections via setters", function (this: RealmContext) {
      const { counter, list, dictionary, set, objectWithMixed } = this.realm.write(() => {
        const counter = this.realm.create<IWithCounter>(WithCounterSchema.name, {
          counter: 10,
        }).counter;
        const list = this.realm.create<IWithMixed>(WithMixedSchema.name, { list: [20] }).list;
        const dictionary = this.realm.create<IWithMixed>(WithMixedSchema.name, { dictionary: { key: 20 } }).dictionary;
        const set = this.realm.create<IWithMixed>(WithMixedSchema.name, { set: [20] }).set;
        const objectWithMixed = this.realm.create<IWithMixed>(WithMixedSchema.name, { mixed: [20] });

        return { counter, list, dictionary, set, objectWithMixed };
      });
      expectCounter(counter);
      expectRealmList(list);
      expectRealmDictionary(dictionary);
      expectRealmSet(set);
      expect(counter.value).equals(10);
      expect(list[0]).equals(20);
      expect(dictionary.key).equals(20);
      expect(set[0]).equals(20);

      // Collections OF Mixed
      expect(() => {
        this.realm.write(() => {
          list[0] = counter;
        });
      }).to.throw("Using a Counter as a Mixed value is not supported");
      expect(list[0]).equals(20);

      expect(() => {
        this.realm.write(() => {
          list.push(counter);
        });
      }).to.throw("Using a Counter as a Mixed value is not supported");
      expect(list.length).equals(1);
      expect(list[0]).equals(20);

      expect(() => {
        this.realm.write(() => {
          dictionary.key = counter;
        });
      }).to.throw("Using a Counter as a Mixed value is not supported");
      expectKeys(dictionary, ["key"]);
      expect(dictionary.key).equals(20);

      expect(() => {
        this.realm.write(() => {
          dictionary.set({ newKey: counter });
        });
      }).to.throw("Using a Counter as a Mixed value is not supported");
      expectKeys(dictionary, ["key"]);
      expect(dictionary.key).equals(20);

      expect(() => {
        this.realm.write(() => {
          set.add(counter);
        });
      }).to.throw("Using a Counter as a Mixed value is not supported");
      expect(set[0]).equals(20);
      expect(set.has(counter.value)).to.be.false;

      // Collections IN Mixed
      expect(() => {
        this.realm.write(() => {
          objectWithMixed.mixed = [counter];
        });
      }).to.throw("Using a Counter as a Mixed value is not supported");
      expect(list.length).equals(1);
      expect(list[0]).equals(20);

      expect(() => {
        this.realm.write(() => {
          objectWithMixed.mixed = { newKey: counter };
        });
      }).to.throw("Using a Counter as a Mixed value is not supported");
      expectKeys(dictionary, ["key"]);
      expect(dictionary.key).equals(20);
    });
  });
});
