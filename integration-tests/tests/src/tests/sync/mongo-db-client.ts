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

import { expect } from "chai";
import { BSON, ChangeEvent, Credentials, DeleteResult, Document, InsertEvent, MongoDBCollection, User } from "realm";

import { importAppBefore } from "../../hooks";
import { sleep } from "../../utils/sleep";

type TestDocument = {
  _id: number;
  text?: string;
  isLast?: boolean;
};

describe.skipIf(environment.missingServer, "MongoDB Client", function () {
  this.timeout(60_000); // TODO: Temporarily hardcoded until envs are set up.
  importAppBefore("with-db");

  let collection: MongoDBCollection<TestDocument>;
  const serviceName = "mongodb";
  const dbName = "test-database"; // TODO: Change to randomly generated database name whenever AppImporter is refactored.
  const collectionName = "test-collection";

  function getCollection<T extends Document = TestDocument>(currentUser: User | null): MongoDBCollection<T> {
    if (!currentUser) {
      throw new Error("A user must be authenticated before getting a MongoDB collection.");
    }
    return currentUser.mongoClient(serviceName).db(dbName).collection<T>(collectionName);
  }

  function deleteAllDocuments(): Promise<DeleteResult> {
    return collection.deleteMany();
  }

  async function logIn(app: App): Promise<User> {
    return app.currentUser ?? app.logIn(Credentials.anonymous());
  }

  beforeEach(async function (this: AppContext & Mocha.Context) {
    const user = await logIn(this.app);
    collection = getCollection(user);
    await deleteAllDocuments();
  });

  describe("User", function () {
    it("returns a MongoDB service when calling 'mongoClient()'", async function (this: AppContext & Mocha.Context) {
      const service = this.app.currentUser?.mongoClient(serviceName);
      expect(service).to.be.an("object");
      expect(service).to.have.property("db");
      expect(service).to.have.property("serviceName", serviceName);

      const db = service?.db(dbName);
      expect(db).to.be.an("object");
      expect(db).to.have.property("name", dbName);
      expect(db).to.have.property("collection");

      const collection = db?.collection(collectionName);
      expect(collection).to.be.an("object");
      expect(collection).to.have.property("name", collectionName);
      expect(collection).to.have.property("databaseName", dbName);
      expect(collection).to.have.property("serviceName", serviceName);
    });

    it("throws when calling 'mongoClient()' with incorrect type", async function (this: AppContext & Mocha.Context) {
      const notAString = 1;
      //@ts-expect-error Testing incorrect type
      expect(() => this.app.currentUser?.mongoClient(notAString)).to.throw(
        `Expected 'serviceName' to be a string, got a number`,
      );
    });

    it("throws when calling 'mongoClient()' with empty string", async function (this: AppContext & Mocha.Context) {
      expect(() => this.app.currentUser?.mongoClient("")).to.throw(
        "Please provide the name of the MongoDB service to connect to",
      );
    });
  });

  describe("MongoDBCollection", function () {
    const insertedId1 = 1;
    const insertedId2 = 2;
    const insertedId3 = 3;
    const insertedText = "Test document";
    const nonExistentId = 100;

    async function insertThreeDocuments(): Promise<void> {
      const { insertedIds } = await collection.insertMany([
        { _id: insertedId1, text: insertedText },
        { _id: insertedId2, text: insertedText },
        { _id: insertedId3, text: insertedText },
      ]);
      expect(insertedIds).to.have.length(3);
    }

    async function expectToFindDoc(doc: TestDocument, { expectedCount }: { expectedCount: number }): Promise<void> {
      const result = await collection.findOne({ _id: doc._id });
      expect(result).to.deep.equal(doc);

      const count = await collection.count();
      expect(count).to.equal(expectedCount);
    }

    async function expectToNotFindDoc(doc: TestDocument, { expectedCount }: { expectedCount: number }): Promise<void> {
      const result = await collection.findOne({ _id: doc._id });
      expect(result).to.be.null;

      const count = await collection.count();
      expect(count).to.equal(expectedCount);
    }

    async function expectTextToBeUnchanged({
      text,
      expectedCount,
    }: {
      text: string;
      expectedCount: number;
    }): Promise<void> {
      const docs = await collection.find();
      expect(docs).to.have.length(expectedCount);
      for (const doc of docs) {
        expect(doc.text).to.equal(text);
      }
    }

    describe("#find", function () {
      it("returns all documents using empty filter", async function (this: AppContext & Mocha.Context) {
        await insertThreeDocuments();

        const docs = await collection.find();
        expect(docs).to.have.length(3);
        for (const doc of docs) {
          expect(doc).to.have.all.keys("_id", "text");
        }
      });

      it("returns all documents excluding a field using 'projection' option", async function (this: AppContext &
        Mocha.Context) {
        await insertThreeDocuments();

        const docs = await collection.find({}, { projection: { text: false } });
        expect(docs).to.have.length(3);
        for (const doc of docs) {
          expect(doc).to.have.property("_id");
          expect(doc).to.not.have.property("text");
        }
      });

      it("returns documents using query selector", async function (this: AppContext & Mocha.Context) {
        await insertThreeDocuments();

        const docs = await collection.find({ _id: { $gt: insertedId1 } });
        expect(docs).to.have.length(2);
        for (const doc of docs) {
          expect(doc._id > insertedId1).to.be.true;
        }
      });

      it("returns empty array if collection is empty", async function (this: AppContext & Mocha.Context) {
        const docs = await collection.find();
        expect(docs).to.be.empty;
      });
    });

    describe("#findOne", function () {
      it("returns specific document", async function (this: AppContext & Mocha.Context) {
        await insertThreeDocuments();

        const doc = await collection.findOne({ _id: insertedId3 });
        expect(doc).to.deep.equal({ _id: insertedId3, text: insertedText });
      });

      it("returns first document using empty filter", async function (this: AppContext & Mocha.Context) {
        await insertThreeDocuments();

        const doc = await collection.findOne();
        expect(doc).to.deep.equal({ _id: insertedId1, text: insertedText });
      });

      it("returns null when there are no matches", async function (this: AppContext & Mocha.Context) {
        await insertThreeDocuments();

        const doc = await collection.findOne({ _id: nonExistentId });
        expect(doc).to.be.null;
      });
    });

    describe("#findOneAndUpdate", function () {
      const updatedText = "Updated text";

      it("updates specific document", async function (this: AppContext & Mocha.Context) {
        await insertThreeDocuments();

        const newDoc = await collection.findOneAndUpdate(
          { _id: insertedId3 },
          { $set: { text: updatedText } },
          { returnNewDocument: true },
        );
        expect(newDoc).to.deep.equal({ _id: insertedId3, text: updatedText });
      });

      it("returns null when there are no matches", async function (this: AppContext & Mocha.Context) {
        await insertThreeDocuments();

        const newDoc = await collection.findOneAndUpdate(
          { _id: nonExistentId },
          { $set: { text: updatedText } },
          { returnNewDocument: true },
        );
        expect(newDoc).to.be.null;
      });

      it("does not update any document when there are no matches", async function (this: AppContext & Mocha.Context) {
        await insertThreeDocuments();

        const oldDoc = await collection.findOneAndUpdate({ _id: nonExistentId }, { $set: { text: updatedText } });
        expect(oldDoc).to.be.null;

        await expectTextToBeUnchanged({ text: insertedText, expectedCount: 3 });
      });

      it("inserts new document if no matches when using 'upsert'", async function (this: AppContext & Mocha.Context) {
        await insertThreeDocuments();

        const newDoc = await collection.findOneAndUpdate(
          { _id: nonExistentId },
          { $set: { text: updatedText } },
          {
            returnNewDocument: true,
            upsert: true,
          },
        );
        expect(newDoc).to.deep.equal({ _id: nonExistentId, text: updatedText });

        const count = await collection.count();
        expect(count).to.equal(4);
      });
    });

    describe("#findOneAndReplace", function () {
      const updatedText = "Updated text";

      it("replaces specific document", async function (this: AppContext & Mocha.Context) {
        await insertThreeDocuments();

        const newDoc = await collection.findOneAndReplace(
          { _id: insertedId3 },
          { text: updatedText },
          { returnNewDocument: true },
        );
        expect(newDoc).to.deep.equal({ _id: insertedId3, text: updatedText });
      });

      it("returns null when there are no matches", async function (this: AppContext & Mocha.Context) {
        await insertThreeDocuments();

        const oldDoc = await collection.findOneAndReplace({ _id: nonExistentId }, { text: updatedText });
        expect(oldDoc).to.be.null;
      });

      it("does not replace any document when there are no matches", async function (this: AppContext & Mocha.Context) {
        await insertThreeDocuments();

        const oldDoc = await collection.findOneAndReplace({ _id: nonExistentId }, { text: updatedText });
        expect(oldDoc).to.be.null;

        await expectTextToBeUnchanged({ text: insertedText, expectedCount: 3 });
      });
    });

    describe("#findOneAndDelete", function () {
      it("deletes specific document", async function (this: AppContext & Mocha.Context) {
        await insertThreeDocuments();

        const oldDoc = await collection.findOneAndDelete({ _id: insertedId3 });
        expect(oldDoc).to.deep.equal({ _id: insertedId3, text: insertedText });

        await expectToNotFindDoc({ _id: insertedId3 }, { expectedCount: 2 });
      });

      it("deletes first returned document using empty filter", async function (this: AppContext & Mocha.Context) {
        await insertThreeDocuments();

        const oldDoc = await collection.findOneAndDelete();
        expect(oldDoc).to.deep.equal({ _id: insertedId1, text: insertedText });

        await expectToNotFindDoc({ _id: insertedId1 }, { expectedCount: 2 });
      });

      it("returns null when there are no matches", async function (this: AppContext & Mocha.Context) {
        await insertThreeDocuments();

        const oldDoc = await collection.findOneAndDelete({ _id: nonExistentId });
        expect(oldDoc).to.be.null;
      });

      it("does not delete any document when there are no matches", async function (this: AppContext & Mocha.Context) {
        await insertThreeDocuments();

        const oldDoc = await collection.findOneAndDelete({ _id: nonExistentId });
        expect(oldDoc).to.be.null;

        const count = await collection.count();
        expect(count).to.equal(3);
      });
    });

    describe("#insertOne", function () {
      it("inserts document with id", async function (this: AppContext & Mocha.Context) {
        const result = await collection.insertOne({ _id: insertedId1 });
        expect(result.insertedId).to.equal(insertedId1);

        await expectToFindDoc({ _id: insertedId1 }, { expectedCount: 1 });
      });

      it("inserts document without id", async function (this: AppContext & Mocha.Context) {
        const result = await collection.insertOne({ text: insertedText });
        expect(result.insertedId).to.be.instanceOf(BSON.ObjectId);

        const count = await collection.count();
        expect(count).to.equal(1);
      });

      it("throws if inserting document with existing id", async function (this: AppContext & Mocha.Context) {
        await collection.insertOne({ _id: insertedId1 });

        await expect(collection.insertOne({ _id: insertedId1 })).to.be.rejectedWith("Duplicate key error");
      });
    });

    describe("#insertMany", function () {
      it("inserts documents with ids", async function (this: AppContext & Mocha.Context) {
        const result = await collection.insertMany([{ _id: insertedId1 }, { _id: insertedId2 }, { _id: insertedId3 }]);
        expect(result.insertedIds).to.have.length(3);

        const count = await collection.count();
        expect(count).to.equal(3);
      });

      it("inserts documents without ids", async function (this: AppContext & Mocha.Context) {
        const result = await collection.insertMany([
          { text: insertedText },
          { text: insertedText },
          { text: insertedText },
        ]);
        expect(result.insertedIds).to.have.length(3);
        for (const insertedId of result.insertedIds) {
          expect(insertedId).to.be.instanceOf(BSON.ObjectId);
        }

        const count = await collection.count();
        expect(count).to.equal(3);
      });

      it("throws if inserting document with existing id", async function (this: AppContext & Mocha.Context) {
        await collection.insertMany([{ _id: insertedId1 }]);

        await expect(collection.insertMany([{ _id: insertedId1 }])).to.be.rejectedWith("Duplicate key error");
      });
    });

    describe("#updateOne", function () {
      const updatedText = "Updated text";

      it("updates specific document", async function (this: AppContext & Mocha.Context) {
        await insertThreeDocuments();

        const result = await collection.updateOne({ _id: insertedId3 }, { $set: { text: updatedText } });
        expect(result).to.deep.equal({ matchedCount: 1, modifiedCount: 1 });

        await expectToFindDoc({ _id: insertedId3, text: updatedText }, { expectedCount: 3 });
      });

      it("does not update any document when there are no matches", async function (this: AppContext & Mocha.Context) {
        await insertThreeDocuments();

        const result = await collection.updateOne({ _id: nonExistentId }, { $set: { text: updatedText } });
        expect(result).to.deep.equal({ matchedCount: 0, modifiedCount: 0 });

        await expectTextToBeUnchanged({ text: insertedText, expectedCount: 3 });
      });

      it("inserts new document if no matches when using 'upsert'", async function (this: AppContext & Mocha.Context) {
        await insertThreeDocuments();

        const result = await collection.updateOne(
          { _id: nonExistentId },
          { $set: { text: updatedText } },
          { upsert: true },
        );
        expect(result).to.deep.equal({
          matchedCount: 0,
          modifiedCount: 0,
          upsertedId: nonExistentId,
        });

        await expectToFindDoc({ _id: nonExistentId, text: updatedText }, { expectedCount: 4 });
      });
    });

    describe("#updateMany", function () {
      const updatedText = "Updated text";

      it("updates documents using query selector", async function (this: AppContext & Mocha.Context) {
        await insertThreeDocuments();

        const result = await collection.updateMany({ _id: { $gt: insertedId1 } }, { $set: { text: updatedText } });
        expect(result).to.deep.equal({ matchedCount: 2, modifiedCount: 2 });

        await expectToFindDoc({ _id: insertedId2, text: updatedText }, { expectedCount: 3 });
        await expectToFindDoc({ _id: insertedId3, text: updatedText }, { expectedCount: 3 });
      });

      it("does not update any document when there are no matches", async function (this: AppContext & Mocha.Context) {
        await insertThreeDocuments();

        const result = await collection.updateMany({ _id: nonExistentId }, { $set: { text: updatedText } });
        expect(result).to.deep.equal({ matchedCount: 0, modifiedCount: 0 });

        await expectTextToBeUnchanged({ text: insertedText, expectedCount: 3 });
      });

      it("inserts new document if no matches when using 'upsert'", async function (this: AppContext & Mocha.Context) {
        await insertThreeDocuments();

        const result = await collection.updateMany(
          { _id: nonExistentId },
          { $set: { text: updatedText } },
          { upsert: true },
        );
        expect(result).to.deep.equal({
          matchedCount: 0,
          modifiedCount: 0,
          upsertedId: nonExistentId,
        });

        await expectToFindDoc({ _id: nonExistentId, text: updatedText }, { expectedCount: 4 });
      });
    });

    describe("#deleteOne", function () {
      it("deletes specific document", async function (this: AppContext & Mocha.Context) {
        await insertThreeDocuments();

        const result = await collection.deleteOne({ _id: insertedId3 });
        expect(result.deletedCount).to.equal(1);

        await expectToNotFindDoc({ _id: insertedId3 }, { expectedCount: 2 });
      });

      it("deletes first returned document using empty filter", async function (this: AppContext & Mocha.Context) {
        await insertThreeDocuments();

        const result = await collection.deleteOne();
        expect(result.deletedCount).to.equal(1);

        await expectToNotFindDoc({ _id: insertedId1 }, { expectedCount: 2 });
      });

      it("does not delete any document when there are no matches", async function (this: AppContext & Mocha.Context) {
        await insertThreeDocuments();

        const result = await collection.deleteOne({ _id: nonExistentId });
        expect(result.deletedCount).to.equal(0);

        const count = await collection.count();
        expect(count).to.equal(3);
      });
    });

    describe("#deleteMany", function () {
      it("deletes all documents using empty filter", async function (this: AppContext & Mocha.Context) {
        await insertThreeDocuments();

        const result = await collection.deleteMany();
        expect(result.deletedCount).to.equal(3);

        const count = await collection.count();
        expect(count).to.equal(0);
      });

      it("deletes documents using query selector", async function (this: AppContext & Mocha.Context) {
        await insertThreeDocuments();

        const result = await collection.deleteMany({ _id: { $gt: insertedId1 } });
        expect(result.deletedCount).to.equal(2);

        const count = await collection.count();
        expect(count).to.equal(1);
      });

      it("does not delete any document when there are no matches", async function (this: AppContext & Mocha.Context) {
        await insertThreeDocuments();

        const result = await collection.deleteMany({ _id: nonExistentId });
        expect(result.deletedCount).to.equal(0);

        const count = await collection.count();
        expect(count).to.equal(3);
      });
    });

    describe("#count", function () {
      it("returns total number of documents using empty filter", async function (this: AppContext & Mocha.Context) {
        const countBefore = await collection.count();
        expect(countBefore).to.equal(0);

        await insertThreeDocuments();

        const countAfter = await collection.count();
        expect(countAfter).to.equal(3);
      });

      it("returns number of documents using query selector", async function (this: AppContext & Mocha.Context) {
        await insertThreeDocuments();

        const count = await collection.count({ _id: { $gt: insertedId1 } });
        expect(count).to.equal(2);
      });

      it("returns zero when there are no matches", async function (this: AppContext & Mocha.Context) {
        const count = await collection.count({ _id: nonExistentId });
        expect(count).to.equal(0);
      });
    });

    describe("#aggregate", function () {
      it("aggregates documents using multiple pipeline stages", async function (this: AppContext & Mocha.Context) {
        await insertThreeDocuments();

        const result = await collection.aggregate([
          // Filter all docs with `_id` > `insertedId1`.
          { $match: { _id: { $gt: insertedId1 } } },
          // Return a single doc (`_id: null`) with property `count` set to the number of filtered docs.
          { $group: { _id: null, count: { $sum: 1 } } },
          // Remove the `_id` field from the result.
          { $project: { _id: false } },
        ]);
        expect(result).to.deep.equal([{ count: 2 }]);

        // Note:
        // If getting `Error: exec: "assisted_agg": executable file not found in $PATH`:
        //  1) Download the file `assisted_agg` (if on Mac) or `libmongo.so` (if on Linux) and add it
        //     to your PATH (see https://github.com/10gen/baas/blob/master/etc/docs/onboarding.md).
        //  2) Load the PATH variable to the terminal window used for starting the BaaS server.
        //  3) Allow the file to be executable (run: chmod +x your/path/to/assisted_agg).
        //  4) When running the test again, Mac will block execution of the file. Then (for Mac) go
        //     to `System Settings > Privacy & Security`, find blocked files, then allow `assisted_agg`.
        //  5) Run the test.
      });
    });

    // TODO: Remove the skip once https://github.com/react-native-community/fetch/issues/13 (text streaming broken on Android) gets resolved
    describe.skipIf(environment.android, "#watch", function () {
      const text = "use some odd chars to force weird encoding %\n\r\n\\????>>>>";
      const numInserts = 10;
      // Used as a flag for knowing when to stop watching.
      const lastDocument = { _id: numInserts, isLast: true };

      function assertIsInsert<
        T extends Document = TestDocument,
      >(event: ChangeEvent<T>): asserts event is InsertEvent<T> {
        if (event.operationType !== "insert") {
          throw new Error(`Expected an insert event, got ${event.operationType}.`);
        }
      }

      async function insertDocumentsOneByOne(): Promise<void> {
        // There is a race with creating the watch() streams, since they won't
        // see inserts from before they are created.
        // Wait 500ms (490+10) before first insert to try to avoid it.
        await sleep(490);
        for (let i = 0; i < numInserts; i++) {
          await collection.insertOne({ _id: i, text });
          await sleep(10);
        }
        await collection.insertOne(lastDocument);
      }

      it("streams any inserted documents", async function (this: AppContext & Mocha.Context) {
        const startWatching = async () => {
          let expectedId = 0;
          for await (const event of collection.watch()) {
            assertIsInsert(event);
            expect(event.fullDocument._id).to.equal(expectedId++);
            if (event.fullDocument.isLast) break;
          }
        };

        await Promise.all([startWatching(), insertDocumentsOneByOne()]);
      });

      it("streams inserted documents using 'filter' option", async function (this: AppContext & Mocha.Context) {
        const watchedId = 3;
        const filter = {
          $or: [{ "fullDocument._id": watchedId, "fullDocument.text": text }, { "fullDocument.isLast": true }],
        };

        const startWatching = async () => {
          let seenIt = false;
          for await (const event of collection.watch({ filter })) {
            assertIsInsert(event);
            if (event.fullDocument.isLast) break;
            expect(event.fullDocument._id).to.equal(watchedId);
            seenIt = true;
          }
          expect(seenIt).to.be.true;
        };

        await Promise.all([startWatching(), insertDocumentsOneByOne()]);
      });

      it("streams inserted documents using 'ids' option", async function (this: AppContext & Mocha.Context) {
        const watchedId = 3;
        const ids = [watchedId, lastDocument._id];

        const startWatching = async () => {
          let seenIt = false;
          for await (const event of collection.watch({ ids })) {
            assertIsInsert(event);
            if (event.fullDocument.isLast) break;
            expect(event.fullDocument._id).to.equal(watchedId);
            seenIt = true;
          }
          expect(seenIt).to.be.true;
        };

        await Promise.all([startWatching(), insertDocumentsOneByOne()]);
      });

      it("throws when the user is logged out", async function (this: AppContext & Mocha.Context) {
        await this.app.currentUser?.logOut();
        expect(this.app.currentUser).to.be.null;

        const startWatching = async () => {
          for await (const _ of collection.watch()) {
            expect.fail("Expected 'watch()' to throw, but received a change stream.");
          }
        };

        await expect(startWatching()).to.be.rejectedWith("Request failed: Unauthorized (401)");
      });
    });
  });
});
