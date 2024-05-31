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
import Realm, { BSON, Counter, ObjectSchema, UpdateMode } from "realm";

import { openRealmBeforeEach } from "../hooks";
import { expectCounter, expectRealmDictionary, expectRealmList, expectRealmSet } from "../utils/expects";

interface IWithCounter {
  _id: BSON.ObjectId;
  counter: Counter;
}

const WithCounterSchema: ObjectSchema = {
  name: "WithCounter",
  primaryKey: "_id",
  properties: {
    _id: { type: "objectId", default: () => new BSON.ObjectId() },
    counter: "counter",
  },
};

interface IWithNullableCounter {
  _id: BSON.ObjectId;
  nullableCounter?: Counter | null;
}

const WithNullableCounterSchema: ObjectSchema = {
  name: "WithNullableCounter",
  primaryKey: "_id",
  properties: {
    _id: { type: "objectId", default: () => new BSON.ObjectId() },
    nullableCounter: "counter?",
  },
};

interface IWithDefaultCounter {
  counterWithDefault: Counter;
}

const WithDefaultCounterSchema: ObjectSchema = {
  name: "WithDefaultCounter",
  properties: {
    counterWithDefault: { type: "int", presentation: "counter", default: 10 },
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

function expectKeys(dictionary: Realm.Dictionary, keys: string[]) {
  expect(Object.keys(dictionary)).members(keys);
}

describe("Counter", () => {
  openRealmBeforeEach({
    schema: [
      WithCounterSchema,
      WithNullableCounterSchema,
      WithDefaultCounterSchema,
      WithRegularIntSchema,
      WithMixedSchema,
    ],
  });

  const initialValuesList = [-100, 0, 1.0, 1000] as const;

  describe("create and access", () => {
    describe("via 'realm.create()'", () => {
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
        // First create Realm objects with counters.
        const initialCounterValues = this.realm.write(() => {
          return initialNumValues.map((input) => {
            const { counter } = this.realm.create<IWithCounter>(WithCounterSchema.name, {
              counter: input,
            });
            expectCounter(counter);
            expect(counter.value).equals(input);
            return counter;
          });
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
        expect(counterWithDefault.value).equals(10);
      });

      it("can create nullable counter with int or null", function (this: RealmContext) {
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
  });

  describe("update", () => {
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
      it("updates nullable counter from int -> null -> int via setter", function (this: RealmContext) {
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
          // @ts-expect-error Cannot currently express in TS that a Counter can be set to a number (while 'get' returns Counter).
          object.nullableCounter = 1;
        });
        expectCounter(object.nullableCounter);
        expect(object.nullableCounter.value).equals(1);

        this.realm.write(() => {
          object.nullableCounter = undefined;
        });
        expect(object.nullableCounter).to.be.null;

        this.realm.write(() => {
          // @ts-expect-error Cannot currently express in TS that a Counter can be set to a number (while 'get' returns Counter).
          object.nullableCounter = -100_000;
        });
        expectCounter(object.nullableCounter);
        expect(object.nullableCounter.value).equals(-100_000);
      });

      for (const updateMode of [UpdateMode.Modified, UpdateMode.All]) {
        it(`updates nullable counter from int -> null -> int via UpdateMode: ${updateMode}`, function (this: RealmContext) {
          const object = this.realm.write(() => {
            return this.realm.create<IWithNullableCounter>(WithNullableCounterSchema.name, {
              nullableCounter: 0,
            });
          });
          expectCounter(object.nullableCounter);

          const _id = object._id;

          this.realm.write(() => {
            this.realm.create<IWithNullableCounter>(
              WithNullableCounterSchema.name,
              {
                _id,
                nullableCounter: null,
              },
              updateMode,
            );
          });
          expect(object.nullableCounter).to.be.null;

          this.realm.write(() => {
            this.realm.create<IWithNullableCounter>(
              WithNullableCounterSchema.name,
              {
                _id,
                nullableCounter: 1,
              },
              updateMode,
            );
          });
          expectCounter(object.nullableCounter);
          expect(object.nullableCounter.value).equals(1);

          this.realm.write(() => {
            this.realm.create<IWithNullableCounter>(
              WithNullableCounterSchema.name,
              {
                _id,
                nullableCounter: null,
              },
              updateMode,
            );
          });
          expect(object.nullableCounter).to.be.null;

          this.realm.write(() => {
            this.realm.create<IWithNullableCounter>(
              WithNullableCounterSchema.name,
              {
                _id,
                nullableCounter: -100_000,
              },
              updateMode,
            );
          });
          expectCounter(object.nullableCounter);
          expect(object.nullableCounter.value).equals(-100_000);
        });
      }
    });
  });

  describe("filtering", () => {
    it("filters objects with counters", function (this: RealmContext) {
      this.realm.write(() => {
        this.realm.create<IWithCounter>(WithCounterSchema.name, { counter: -100_000 });

        this.realm.create<IWithCounter>(WithCounterSchema.name, { counter: 10 });
        this.realm.create<IWithCounter>(WithCounterSchema.name, { counter: 10 });
        this.realm.create<IWithCounter>(WithCounterSchema.name, { counter: 10 });

        this.realm.create<IWithCounter>(WithCounterSchema.name, { counter: 500 });
      });
      const objects = this.realm.objects<IWithCounter>(WithCounterSchema.name);
      expect(objects.length).equals(5);

      let filtered = objects.filtered("counter > 10");
      expect(filtered.length).equals(1);

      filtered = objects.filtered("counter < $0", 501);
      expect(filtered.length).equals(5);

      filtered = objects.filtered("counter = 10");
      expect(filtered.length).equals(3);

      this.realm.write(() => {
        for (const object of objects) {
          object.counter.set(0);
        }
      });
      expect(filtered.length).equals(0);
    });
  });

  describe("Realm.schema", () => {
    it("includes `presentation: 'counter'` in the canonical property schema", function (this: RealmContext) {
      const objectSchema = this.realm.schema.find((objectSchema) => objectSchema.name === WithCounterSchema.name);
      expect(objectSchema).to.be.an("object");

      const counterPropertySchema = objectSchema?.properties.counter;
      expect(counterPropertySchema).deep.equals({
        name: "counter",
        type: "int",
        presentation: "counter",
        optional: false,
        indexed: false,
        mapTo: "counter",
        default: undefined,
      });
    });
  });

  describe("invalid operations", () => {
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

    it("throws when setting 'Counter.value' directly", function (this: RealmContext) {
      const { counter } = this.realm.write(() => {
        return this.realm.create<IWithCounter>(WithCounterSchema.name, {
          counter: 10,
        });
      });
      expectCounter(counter);
      expect(counter.value).equals(10);

      expect(() => {
        this.realm.write(() => {
          // @ts-expect-error Assigning to read-only property.
          counter.value = 20;
        });
      }).to.throw("To update the value, use the methods on the Counter");
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

    it("throws when setting a non-nullable counter via setter", function (this: RealmContext) {
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
          // @ts-expect-error Cannot currently express in TS that a Counter can be set to a number (while 'get' returns Counter).
          object.counter = 0;
        });
      }).to.throw(
        "You can only reset a Counter instance when initializing a previously null Counter or resetting a nullable Counter to null. To update the value of the Counter, use its instance methods",
      );
      expect(object.counter.value).equals(10);

      expect(() => {
        this.realm.write(() => {
          // @ts-expect-error Testing incorrect type.
          object.counter = null;
        });
      }).to.throw(
        "You can only reset a Counter instance when initializing a previously null Counter or resetting a nullable Counter to null. To update the value of the Counter, use its instance methods",
      );
      expect(object.counter.value).equals(10);
    });

    for (const updateMode of [UpdateMode.Modified, UpdateMode.All]) {
      it(`throws when setting a non-nullable counter via UpdateMode: ${updateMode}`, function (this: RealmContext) {
        const object = this.realm.write(() => {
          return this.realm.create<IWithCounter>(WithCounterSchema.name, {
            counter: 10,
          });
        });
        const counter = object.counter;
        expectCounter(counter);
        expect(counter.value).equals(10);

        const _id = object._id;

        expect(() => {
          this.realm.write(() => {
            this.realm.create<IWithCounter>(
              WithCounterSchema.name,
              {
                _id,
                counter: 0,
              },
              updateMode,
            );
          });
        }).to.throw(
          "You can only reset a Counter instance when initializing a previously null Counter or resetting a nullable Counter to null. To update the value of the Counter, use its instance methods",
        );
        expect(object.counter.value).equals(10);

        expect(() => {
          this.realm.write(() => {
            this.realm.create<IWithCounter>(
              WithCounterSchema.name,
              {
                _id,
                // @ts-expect-error Testing incorrect type.
                counter: null,
              },
              updateMode,
            );
          });
        }).to.throw(
          "You can only reset a Counter instance when initializing a previously null Counter or resetting a nullable Counter to null. To update the value of the Counter, use its instance methods",
        );
        expect(object.counter.value).equals(10);
      });
    }

    it("throws when setting a nullable counter from number -> number via setter", function (this: RealmContext) {
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
          // @ts-expect-error Testing incorrect type.
          object.nullableCounter = 0;
        });
      }).to.throw(
        "You can only reset a Counter instance when initializing a previously null Counter or resetting a nullable Counter to null. To update the value of the Counter, use its instance methods",
      );
      expect(object.nullableCounter?.value).equals(10);
    });

    for (const updateMode of [UpdateMode.Modified, UpdateMode.All]) {
      it(`throws when setting a nullable counter from number -> number via UpdateMode: ${updateMode}`, function (this: RealmContext) {
        const object = this.realm.write(() => {
          return this.realm.create<IWithNullableCounter>(WithNullableCounterSchema.name, {
            nullableCounter: 10,
          });
        });
        const counter = object.nullableCounter;
        expectCounter(counter);
        expect(counter.value).equals(10);

        const _id = object._id;

        expect(() => {
          this.realm.write(() => {
            this.realm.create<IWithNullableCounter>(
              WithNullableCounterSchema.name,
              {
                _id,
                nullableCounter: 0,
              },
              updateMode,
            );
          });
        }).to.throw(
          "You can only reset a Counter instance when initializing a previously null Counter or resetting a nullable Counter to null. To update the value of the Counter, use its instance methods",
        );
        expect(object.nullableCounter?.value).equals(10);
      });
    }

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

    it("throws when using counter as query argument", function (this: RealmContext) {
      const { counter } = this.realm.write(() => {
        return this.realm.create<IWithCounter>(WithCounterSchema.name, {
          counter: 10,
        });
      });
      expectCounter(counter);

      const objects = this.realm.objects(WithCounterSchema.name);
      expect(objects.length).equals(1);

      expect(() => {
        objects.filtered("counter = $0", counter);
      }).to.throw("Using a Counter as a query argument is not supported. Use 'Counter.value'");
    });
  });
});
