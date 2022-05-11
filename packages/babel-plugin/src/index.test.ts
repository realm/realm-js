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

import * as babel from "@babel/core";

import type { ObjectSchema } from "realm";

import { describeProperty, extractSchema } from "./tests/generator";
import { transform, TransformOptions } from "./tests/transform";

type TransformTestOptions = { name: string; test: (result: babel.BabelFileResult) => void } & TransformOptions;

function itTransforms({ name, test, ...options }: TransformTestOptions) {
  it(name, () => {
    const result = transform(options);
    test(result);
  });
}

function itTransformsSchema(name: string, source: string, test: (schema: ObjectSchema | undefined) => void) {
  itTransforms({
    name,
    source,
    test(result) {
      const schema = extractSchema(result);
      test(schema);
    },
  });
}

describe("Babel plugin", () => {
  describe("class transformation", () => {
    itTransformsSchema(
      "doesn't transform when Realm.Object is unresolved",
      "class Person extends Realm.Object {}",
      (schema) => {
        expect(schema).toBe(undefined);
      },
    );

    itTransformsSchema(
      "transform class using via `import * as Realm from 'realm'`",
      "import * as Realm from 'realm'; class Person extends Realm.Object {}",
      (schema) => {
        expect(schema && schema.name).toBe("Person");
      },
    );

    itTransformsSchema(
      "transform class using via `import Realm from 'realm'`",
      "import Realm from 'realm'; class Person extends Realm.Object {}",
      (schema) => {
        expect(schema && schema.name).toBe("Person");
      },
    );

    itTransformsSchema(
      "transform class using via `import { Object } from 'realm'`",
      "import { Object } from 'realm'; class Person extends Object {}",
      (schema) => {
        expect(schema && schema.name).toBe("Person");
      },
    );

    itTransformsSchema(
      "transform class using `import Realm, { Object } from 'realm'`",
      "import Realm, { Object } from 'realm'; class Person extends Object {}",
      (schema) => {
        expect(schema && schema.name).toBe("Person");
      },
    );

    itTransformsSchema(
      "transform class using via `import { Object } from 'realm'` and providing type argument",
      "import { Object } from 'realm'; class Person extends Object<Person> {}",
      (schema) => {
        expect(schema && schema.name).toBe("Person");
      },
    );
  });

  /*
  itTransforms({
    name: "handles property decorators",
    source: "class Person extends Realm.Object { @test() testing: boolean = 0 }",
    extraPlugins: [["@babel/plugin-proposal-decorators", { version: "2021-12" }]],
    test() {
      //
    },
  });
  */

  describe("type transformations", () => {
    describeProperty("boolean", {
      type: "bool",
      defaults: [undefined, true, false],
    });

    describeProperty("int", {
      type: "int",
      defaults: [undefined, 123],
    });

    describeProperty("float", {
      type: "float",
      defaults: [undefined, 123],
    });

    describeProperty("double", {
      type: "double",
      defaults: [undefined, 123],
    });

    describeProperty("string", {
      type: "string",
      defaults: [undefined, "foo"],
    });

    describeProperty("decimal128", {
      type: "decimal128",
      defaults: [
        undefined,
        { source: "new Realm.Types.Decimal128()" },
        { source: "new Types.Decimal128()" },
        { source: "new Realm.BSON.Decimal128()" },
        { source: "new BSON.Decimal128()" },
      ],
    });

    describeProperty("objectId", {
      type: "objectId",
      defaults: [
        undefined,
        { source: "new Realm.Types.ObjectId()" },
        { source: "new Types.ObjectId()" },
        { source: "new Realm.BSON.ObjectId()" },
        { source: "new BSON.ObjectId()" },
      ],
    });

    describeProperty("link", {
      type: "Person",
    });

    describeProperty("list", {
      type: "list",
      objectTypes: ["Person", "int"],
    });
  });
});
