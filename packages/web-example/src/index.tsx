import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { Realm } from "realm";
import { expect } from "chai";
import { expectSimilar } from "./comparisons"

async function setupRealm() {
  type Task = {
    name: string;
    done: boolean;
  };
  
  const TASK_SCHEMA: Realm.ObjectSchema = {
    name: "Task",
    properties: {
      name: "string",
      done: "bool",
    },
  };

  const realm = await Realm.open({
    schema: [TASK_SCHEMA],
  });
  
  console.log("Realm open:");
  console.log({realm});  

  console.log("**** CREATE ****");
  realm.write(() => {
    let task1 = realm.create<Task>("Task", {
      name: "go grocery shopping", done: false
    });
    console.log({task1});

    let task2 = realm.create<Task>("Task", {
      name: "go exercise", done: false
    });
    console.log({task2});  
});

console.log("**** QUERY ****");
var results = realm.objects<Task>("Task");

console.log("**** READ ****");
results.forEach((value: Task, index) => {  
  console.log(`Task#${index}:  ${value.name}`);
}); 

console.log("**** UPDATE **** ");
realm.write(() => {
  results[0].done = true;
});

results = realm.objects<Task>("Task").filtered("done == true");
console.log(`Number of completed tasks: ${results.length}`);

console.log("**** DELETE ****");
realm.write(() => {
  realm.delete(results[0] as unknown as Task & Realm.Object);
});
console.log(`Number of tasks after deletion: ${realm.objects<Task>("Task").length}`);  
}

async function test() {
  const RANDOM_DATA = new Uint8Array([
    0xd8, 0x21, 0xd6, 0xe8, 0x00, 0x57, 0xbc, 0xb2, 0x6a, 0x15, 0x77, 0x30, 0xac, 0x77, 0x96, 0xd9, 0x67, 0x1e, 0x40,
    0xa7, 0x6d, 0x52, 0x83, 0xda, 0x07, 0x29, 0x9c, 0x70, 0x38, 0x48, 0x4e, 0xff,
  ]);
  
  const allTypesValues = {
    boolCol: true,
    intCol: 1,
    floatCol: 1.1,
    doubleCol: 1.11,
    stringCol: "string",
    dateCol: new Date(1),
    dataCol: RANDOM_DATA,
    objectCol: { doubleCol: 2.2 },
  
    optBoolCol: true,
    optIntCol: 1,
    optFloatCol: 1.1,
    optDoubleCol: 1.11,
    optStringCol: "string",
    optDateCol: new Date(1),
    optDataCol: RANDOM_DATA,
  
    boolArrayCol: [true],
    intArrayCol: [1],
    floatArrayCol: [1.1],
    doubleArrayCol: [1.11],
    stringArrayCol: ["string"],
    dateArrayCol: [new Date(1)],
    dataArrayCol: [RANDOM_DATA],
    objectArrayCol: [{ doubleCol: 2.2 }],
  
    optBoolArrayCol: [true],
    optIntArrayCol: [1],
    optFloatArrayCol: [1.1],
    optDoubleArrayCol: [1.11],
    optStringArrayCol: ["string"],
    optDateArrayCol: [new Date(1)],
    optDataArrayCol: [RANDOM_DATA],
  };

  const TestObjectSchema = {
    name: "TestObject",
    properties: {
      doubleCol: "double",
    },
  };

  const LinkToAllTypesSchema = {
    name: "LinkToAllTypesObject",
    properties: {
      allTypesCol: "AllTypesObject",
    },
  };

  const AllTypesSchema = {
    name: "AllTypesObject",
    properties: {
      boolCol: "bool",
      intCol: "int",
      floatCol: "float",
      doubleCol: "double",
      stringCol: "string",
      dateCol: "date",
      dataCol: "data",
      objectCol: "TestObject",
  
      optBoolCol: "bool?",
      optIntCol: "int?",
      optFloatCol: "float?",
      optDoubleCol: "double?",
      optStringCol: "string?",
      optDateCol: "date?",
      optDataCol: "data?",
  
      boolArrayCol: "bool[]",
      intArrayCol: "int[]",
      floatArrayCol: "float[]",
      doubleArrayCol: "double[]",
      stringArrayCol: "string[]",
      dateArrayCol: "date[]",
      dataArrayCol: "data[]",
      objectArrayCol: "TestObject[]",
  
      optBoolArrayCol: "bool?[]",
      optIntArrayCol: "int?[]",
      optFloatArrayCol: "float?[]",
      optDoubleArrayCol: "double?[]",
      optStringArrayCol: "string?[]",
      optDateArrayCol: "date?[]",
      optDataArrayCol: "data?[]",
  
      linkingObjectsCol: { type: "linkingObjects", objectType: "LinkToAllTypesObject", property: "allTypesCol" },
    },
  };
  interface ITestObject {
    doubleCol: number;
  };
  interface IAllTypes {
    boolCol: boolean;
    intCol: number;
    floatCol: number;
    doubleCol: number;
    stringCol: string;
    dateCol: Date;
    dataCol: ArrayBuffer;
    objectCol: ITestObject;
  
    optBoolCol: boolean | undefined;
    optIntCol: number | undefined;
    optFloatCol: number | undefined;
    optDoubleCol: number | undefined;
    optStringCol: string | undefined;
    optDateCol: Date | undefined;
    optDataCol: ArrayBuffer | undefined;
  
    boolArrayCol: boolean[];
    intArrayCol: number[];
    floatArrayCol: number[];
    doubleArrayCol: number[];
    stringArrayCol: string[];
    dateArrayCol: Date[];
    dataArrayCol: ArrayBuffer[];
    objectArrayCol: ITestObject[];
  
    optBoolArrayCol: (boolean | undefined)[];
    optIntArrayCol: (number | undefined)[];
    optFloatArrayCol: (number | undefined)[];
    optDoubleArrayCol: (number | undefined)[];
    optStringArrayCol: (string | undefined)[];
    optDateArrayCol: (Date | undefined)[];
    optDataArrayCol: (ArrayBuffer | undefined)[];
    linkingObjectsCol: IAllTypes[];
  };

  const nullPropertyValues = (() => {
    const values = {};
    for (const name in allTypesValues) {
      if (name.includes("opt")) {
        //@ts-expect-error TYPEBUG: indexing with string is not allowed by typesystem.
        values[name] = name.includes("Array") ? [null] : null;
      } else {
        //@ts-expect-error TYPEBUG: indexing with string is not allowed by typesystem.
        values[name] = allTypesValues[name];
      }
    }
    return values;
  })();

  const realm = new Realm({ schema: [AllTypesSchema, LinkToAllTypesSchema, TestObjectSchema] });
  // let realm = await Realm.open({ schema: [AllTypesSchema, TestObjectSchema], path: "/foo/bar" });
  let object!: IAllTypes;
  let nullObject!: IAllTypes;
  realm.write(() => {
    object = realm.create<IAllTypes>("AllTypesObject", allTypesValues);
    nullObject = realm.create<IAllTypes>("AllTypesObject", nullPropertyValues);
  });

  const objectSchema = realm.schema[0];
  for (const name of Object.keys(objectSchema.properties)) {
    const type = objectSchema.properties[name].type;
    
    if (type === "linkingObjects") {
      //@ts-expect-error TYPEBUG: indexing with string is not allowed by typesystem.
      expect(object[name].length).equals(0);
      //@ts-expect-error TYPEBUG: indexing with string is not allowed by typesystem.
      expect(nullObject[name].length).equals(0);
      continue;
    }

    //@ts-expect-error TYPEBUG: indexing with string is not allowed by typesystem.
    const objectTarget = object[name];
    //@ts-expect-error TYPEBUG: indexing with string is not allowed by typesystem.
    const nullObjectTarget = nullObject[name];

    //@ts-expect-error TYPEBUG: indexing with string is not allowed by typesystem.
    expectSimilar(type, objectTarget, allTypesValues[name]);
    //@ts-expect-error TYPEBUG: indexing with string is not allowed by typesystem.
    expectSimilar(type, nullObjectTarget, nullPropertyValues[name]);
    // console.log(`type: ${type}, original allTypesValues[${name}]: ${allTypesValues[name]},  persisted:${objectTarget}\n`);
  }
}
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
test();