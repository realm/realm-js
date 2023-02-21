////////////////////////////////////////////////////////////////////////////
//
// Copyright 2021 Realm Inc.
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
describe("Realm", function () {
  it("should be requirable", function () {
    var realm = require("realm");

    expect(typeof realm).toBe("function");
    expect(realm.name).toBe("Realm");
  });

  it("should open and close realm", async function () {
    const Realm = require("realm");
    let realm = await Realm.open({
      schema: [
        {
          name: "Simple",
          properties: {
            v: "string",
          },
        },
      ],
    });
    try {
      realm.write(() => {
        realm.create("Simple", { v: "Hello" });
      });

      expect(realm.isClosed).toBe(false);
    } finally {
      realm.close();

      expect(realm.isClosed).toBe(true);
      Realm.clearTestState();

      // Workaround for segfault issue – Node 12 environment teardown after the end of the test
      // seems to happen before the Realm is fully closed, resulting in a segfault. Delaying
      // the end of the test until the main thread code has finished running with setTimeout
      // avoids this. See: https://github.com/realm/realm-js/pull/4025
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  });
});
