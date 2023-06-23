////////////////////////////////////////////////////////////////////////////
//
// Copyright 2020 Realm Inc.
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

import { Credentials } from "realm-web";

import { createApp } from "./utils";

type TestDocument = {
  name: string;
  runId: number;
  hiddenField?: string;
} & Realm.Services.MongoDB.Document;

describe("Remote MongoDB", () => {
  let app: Realm.App;

  before(async () => {
    // Create an app
    app = createApp();
    // Login a user
    const credentials = Credentials.anonymous();
    await app.logIn(credentials);
  });

  function getCollection<T extends Realm.Services.MongoDB.Document>() {
    if (app.currentUser) {
      const mongodb = app.currentUser.mongoClient("local-mongodb");
      const db = mongodb.db("test-database");
      return db.collection<T>("test-collection");
    } else {
      throw new Error("Expected an authenticated user");
    }
  }

  let runId: number;
  beforeEach(async () => {
    // Genereate a collection
    runId = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
    // Insert a couple of documents
    const collection = getCollection<TestDocument>();
    await collection.insertMany([
      {
        runId,
        name: "Alice",
        hiddenField: "very-secret",
      },
      {
        runId,
        name: "Bob",
        hiddenField: "very-secret",
      },
      {
        runId,
        name: "Charlie",
        hiddenField: "very-secret",
      },
    ]);
  });

  it("can find documents", async () => {
    const collection = getCollection<TestDocument>();
    const result = await collection.find({ name: { $exists: true } }, { limit: 10 });
    if (result.length > 0) {
      const [firstDocument] = result;
      expect(typeof firstDocument._id).equal("object");
      expect(firstDocument._id.constructor.name).equal("ObjectId");
    }
  });

  it("returns null when finding no document", async () => {
    const collection = getCollection<TestDocument>();
    const result = await collection.findOne({
      whatever: "non-existent",
    });
    expect(result).equals(null);
  });

  it("can find a single documents, with projection", async () => {
    const collection = getCollection<TestDocument>();
    const result = await collection.findOne({ runId, name: "Bob" }, { projection: { name: 1 } });
    if (result === null) {
      throw new Error("Expected a result");
    } else {
      expect(typeof result._id).equals("object");
      expect(result._id.constructor.name).equals("ObjectId");
      expect(result.name).equals("Bob");
      expect(result).has.keys("_id", "name");
    }
  });

  it("can upsert a document if no one is found", async () => {
    const collection = getCollection<TestDocument>();
    const result = await collection.findOneAndUpdate(
      { runId, name: "Nobody" },
      { name: "Dennis", hiddenField: "a hidden value" },
      { upsert: true, returnNewDocument: true },
    );
    if (result === null) {
      throw new Error("Expected a result");
    } else {
      expect(typeof result._id).equals("object");
      expect(result._id.constructor.name).equals("ObjectId");
      expect(result.name).equals("Dennis");
      expect(result).has.keys("_id", "name", "hiddenField");
    }
  });

  it("can find and update a document, with projection", async () => {
    const collection = getCollection<TestDocument>();
    const result = await collection.findOneAndUpdate(
      { runId, name: "Bob" },
      { name: "Bobby" },
      { projection: { name: 1 }, returnNewDocument: true },
    );
    if (result === null) {
      throw new Error("Expected a result");
    } else {
      expect(typeof result._id).equals("object");
      expect(result._id.constructor.name).equals("ObjectId");
      expect(result.name).equals("Bobby");
      expect(result).has.keys("_id", "name");
    }
  });

  it("can find and replace a document, with projection", async () => {
    const collection = getCollection<TestDocument>();
    const result = await collection.findOneAndReplace(
      { runId, name: "Alice" },
      { runId, name: "Alison" },
      {
        projection: { name: 1, hiddenField: 1 },
        upsert: true,
        returnNewDocument: true,
      },
    );
    if (result === null) {
      throw new Error("Expected a result");
    } else {
      expect(typeof result._id).equals("object");
      expect(result._id.constructor.name).equals("ObjectId");
      expect(result.name).equals("Alison");
      expect(result).has.keys("_id", "name");
    }
  });

  it("can find and delete a document", async () => {
    const collection = getCollection<TestDocument>();
    const countBefore = await collection.count({ runId });
    // Delete the document with the last name (Charlie)
    const result = await collection.findOneAndDelete({ runId }, { sort: { name: -1 } });
    // Check the result
    if (result === null) {
      throw new Error("Expected a result");
    } else {
      expect(typeof result._id).equals("object");
      expect(result._id.constructor.name).equals("ObjectId");
      expect(result.name).equals("Charlie");
      expect(result).has.keys("_id", "runId", "name", "hiddenField");
    }
    // Ensure a document was deleted
    const countAfter = await collection.count({ runId });
    expect(countAfter).equals(countBefore - 1);
  });

  it("can aggregate", async () => {
    const collection = getCollection<TestDocument>();
    const result = await collection.aggregate([
      { $match: { runId } },
      { $group: { _id: null, names: { $push: "$name" } } },
      { $project: { _id: 0 } },
    ]);
    expect(result).deep.equals([{ names: ["Alice", "Bob", "Charlie"] }]);
  });

  it("can count documents, insert a document and count & retrieve it again", async () => {
    const collection = getCollection<TestDocument>();
    // Determine the number of documents before insertion
    const countBefore = await collection.count();
    // Insert a document
    const insertResult = await collection.insertOne({
      runId,
      name: "Some test document ...",
    });
    expect(typeof insertResult.insertedId).equals("object");
    expect(insertResult.insertedId.constructor.name).equal("ObjectId");
    // Determine the number of documents after insertion
    const countAfter = await collection.count();
    expect(countAfter - countBefore).equals(1);
    // Try to retrieve it again
    const findResult = await collection.findOne({
      _id: { $eq: insertResult.insertedId },
    });
    // Expect a result with a similar object id
    expect(findResult).deep.equals({
      _id: insertResult.insertedId,
      runId,
      name: "Some test document ...",
    });
  });

  it("can insert many documents", async () => {
    const collection = getCollection<TestDocument>();
    // Determine the number of documents before insertion
    const countBefore = await collection.count();
    // Insert a document
    const insertResult = await collection.insertMany([
      { runId, name: "My first document" },
      { runId, name: "My second document" },
    ]);
    expect(insertResult.insertedIds.length).equals(2);
    for (const id of insertResult.insertedIds) {
      expect(typeof id).equals("object");
      expect(id.constructor.name).equal("ObjectId");
    }
    // Determine the number of documents after insertion
    const countAfter = await collection.count();
    expect(countAfter - countBefore).equals(2);
  });

  it("can delete a document", async () => {
    const collection = getCollection<TestDocument>();
    const countBefore = await collection.count({ runId });
    // Delete the document with the last name (Charlie)
    const result = await collection.deleteOne({ runId });
    // Check the result
    expect(typeof result).equals("object");
    expect(result.deletedCount).equals(1);
    // Ensure a document was deleted
    const countAfter = await collection.count({ runId });
    expect(countAfter).equals(countBefore - 1);
  });

  it("can delete many documents", async () => {
    const collection = getCollection<TestDocument>();
    const countBefore = await collection.count({ runId });
    expect(countBefore).equals(3);
    // Delete all documents in this run
    const result = await collection.deleteMany({ runId });
    // Check the result
    expect(typeof result).equals("object");
    expect(result.deletedCount).equals(countBefore);
    // Ensure a document was deleted
    const countAfter = await collection.count({ runId });
    expect(countAfter).equals(0);
  });

  it("can update a document", async () => {
    const collection = getCollection<TestDocument>();
    // Delete the document with the last name (Charlie)
    const result = await collection.updateOne({ runId, name: "Alice" }, { name: "Alison" });
    // Check the result
    expect(typeof result).equals("object");
    expect(result.matchedCount).equals(1);
    expect(result.modifiedCount).equals(1);
    expect(result.upsertedId).equals(undefined);
  });

  it("upserts a document when updating and the query match nothing", async () => {
    const collection = getCollection<TestDocument>();
    // Delete the document with the last name (Charlie)
    const result = await collection.updateOne({ runId, name: "Dennis" }, { runId, name: "Dennis" }, { upsert: true });
    // Check the result
    expect(typeof result).equals("object");
    expect(result.matchedCount).equals(0);
    expect(result.modifiedCount).equals(0);
    expect(typeof result.upsertedId).equals("object");
  });

  it("can update many documents", async () => {
    const collection = getCollection<TestDocument>();
    // Delete the document with the last name (Charlie)
    const result = await collection.updateMany({ runId }, { hiddenField: "same secret" });
    // Check the result
    expect(typeof result).equals("object");
    expect(result.matchedCount).equals(3);
    expect(result.modifiedCount).equals(3);
  });

  it("can update documents using array filters", async () => {
    type ArrayFilterableTestDocument = { values: { status: boolean; condition: number }[] } & TestDocument;
    const collection = getCollection<ArrayFilterableTestDocument>();
    // Insert a document with an embedded array
    await collection.insertOne({
      runId,
      name: "arrayFilter",
      values: [
        {
          condition: 1,
          status: false,
        },
        {
          condition: 2,
          status: false,
        },
      ],
    });

    // Update the array element with condition == 1 to have status == true
    const filter = { runId, name: "arrayFilter" };
    const update = { $set: { "values.$[element].status": true } };
    const arrayFilters = [{ "element.condition": 1 }];
    const result = await collection.updateOne(filter, update, { arrayFilters });
    // Check the result
    expect(typeof result).equals("object");
    expect(result.matchedCount).equals(1);
    expect(result.modifiedCount).equals(1);

    // Fetch the document to ensure that only the filtered elements of the array were updated
    const doc = await collection.findOne({ runId, name: "arrayFilter" });
    if (doc === null) {
      throw new Error("Expected a result");
    } else {
      expect(doc.values[0].status).equals(true);
      expect(doc.values[1].status).equals(false);
    }
  });

  it("upserts when updating many non-existing documents", async () => {
    const collection = getCollection<TestDocument>();
    // Delete the document with the last name (Charlie)
    const result = await collection.updateMany({ runId, name: "Dennis" }, { runId, name: "Dennis" }, { upsert: true });
    // Check the result
    expect(typeof result).equals("object");
    expect(result.matchedCount).equals(0);
    expect(result.modifiedCount).equals(0);
    expect(typeof result.upsertedId).equals("object");
  });

  it("can watch changes correctly", async function () {
    this.timeout(10_000);
    this.slow(2_000);

    const collection = getCollection<any>();

    // Delete all documents in the collection
    await collection.deleteMany({});

    const sleep = async (time: number) => new Promise((resolve) => setInterval(resolve, time));
    const str = "use some odd chars to force weird encoding %\n\r\n\\????>>>>";
    await Promise.all([
      (async () => {
        // There is a race with creating the watch() streams, since they won't
        // see inserts from before they are created.
        // Wait 500ms (490+10) before first insert to try to avoid it.
        await sleep(490);
        for (let i = 0; i < 10; i++) {
          await sleep(10);
          await collection.insertOne({ _id: i, hello: "world", str });
        }
        await collection.insertOne({ _id: "done", done: true }); // Break other sides out of loop
      })(),
      // Watch any event
      (async () => {
        let expected = 0;
        for await (const event of collection.watch()) {
          if (event.operationType === "insert") {
            if (event.fullDocument.done) break;
            expect(event.fullDocument._id).equals(expected++);
          } else {
            throw new Error(`Unexpected ${event.operationType} event`);
          }
        }
        expect(expected).equals(10);
      })(),
      // Watch using the filter option
      (async () => {
        const filter = {
          $or: [{ "fullDocument._id": 3, "fullDocument.str": str }, { "fullDocument.done": true }],
        };
        let seenIt = false;
        for await (const event of collection.watch({ filter })) {
          if (event.operationType === "insert") {
            if (event.fullDocument.done) break;
            expect(event.fullDocument._id).equals(3);
            seenIt = true;
          } else {
            throw new Error(`Unexpected ${event.operationType} event`);
          }
        }
        expect(seenIt, "seenIt for filter");
      })(),
      // Watch using the ids option
      (async () => {
        let seenIt = false;
        for await (const event of collection.watch({
          ids: [5, "done"],
        })) {
          if (event.operationType === "insert") {
            if (event.fullDocument.done) break;
            expect(event.fullDocument._id).equal(5);
            seenIt = true;
          } else {
            throw new Error(`Unexpected ${event.operationType} event`);
          }
        }
        expect(seenIt, "seenIt for ids");
      })(),
    ]);

    // TODO XXX I'm not sure how to replicate this test here.
    /*
        // Test failure of initial request by logging out.
        await user.logOut();
        let err = await TestCase.assertThrowsAsync(async () => {
            for await (let _ of collection.watch()) {
                TestCase.assertTrue(false, "This should be unreachable");
            }
        });
        if (err.code != 401)
            throw err;
            */
  });
});
