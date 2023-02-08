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
import { Document, MongoDBCollection, OperationType } from "realm";

import { authenticateUserBefore, importAppBefore } from "../../hooks";

type TestDocument = {
  _id: number;
  text?: string;
  isLast?: boolean;
};

describe.skipIf(environment.missingServer, "MongoDB Client", function () {
  this.timeout(60_000); // TODO: Temporarily hardcoded until envs are set up.
  importAppBefore("with-db");
  authenticateUserBefore();

  let collection: MongoDBCollection<TestDocument>;
  const serviceName = "mongo-db";
  const dbName = "test-database";
  const collectionName = "test-collection";

  describe("User", function () {
    it("returns a MongoDBService when calling 'mongoClient()'", async function (this: AppContext & Mocha.Context) {
      expect(typeof serviceName === "string" && serviceName.length > 0).to.be.true;

      const service = this.app?.currentUser?.mongoClient(serviceName as string);
      expect(service).to.be.an("object").that.has.all.keys("serviceName", "db");
      expect(service).to.have.property("serviceName", serviceName);

      const db = service?.db(dbName);
      expect(db).to.be.an("object").that.has.all.keys("name", "collection");
      expect(db).to.have.property("name", dbName);

      const collection = db?.collection(collectionName);
      expect(collection).to.be.an("object");
      expect(collection).to.have.property("name", collectionName);
      expect(collection).to.have.property("databaseName", dbName);
      expect(collection).to.have.property("serviceName", serviceName);
    });
  });

  describe("MongoDBCollection", function () {
    // const insertedId1 = generateId();
    // const insertedId2 = generateId();
    // const insertedId3 = generateId();

    // function generateId(): number {
    //   return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
    // }

    function getCollection<T extends Document = TestDocument>(currentUser: User | null): MongoDBCollection<T> {
      if (!currentUser) {
        throw new Error("A user must be authenticated before getting a MongoDB collection.");
      }
      return currentUser.mongoClient(serviceName).db(dbName).collection<T>(collectionName);
    }

    // function insertThreeDocuments() {
    //   return collection.insertMany([{ _id: insertedId1 }, { _id: insertedId2 }, { _id: insertedId3 }]);
    // }

    function deleteAllDocuments() {
      return collection.deleteMany();
    }

    before(function (this: AppContext & Mocha.Context) {
      collection = getCollection(this.app.currentUser);
    });

    after(async function () {
      await deleteAllDocuments();
    });

    // beforeEach(async function () {
    //   await insertThreeDocuments();
    // });

    beforeEach(async function () {
      await deleteAllDocuments();
    });

    describe("#watch", function () {
      const sleep = async (time: number) => new Promise((resolve) => setInterval(resolve, time));
      const text = "use some odd chars to force weird encoding %\n\r\n\\????>>>>";
      const numInserts = 10;
      // Used as a flag for knowing when to stop watching.
      const lastDocument = { _id: numInserts, isLast: true };

      function assertIsInsert(operationType: OperationType): asserts operationType is "insert" {
        if (operationType !== "insert") {
          throw new Error(`Expected an insert event, got ${operationType}.`);
        }
      }

      async function insertDocumentsOneByOne(): Promise<void> {
        // There is a race with creating the watch() streams, since they won't
        // see inserts from before they are created.
        // Wait 500ms (490+10) before first insert to try to avoid it.
        await sleep(490);
        for (let i = 0; i < numInserts - 1; i++) {
          await sleep(10);
          await collection.insertOne({ _id: i, text: text });
        }
        await collection.insertOne(lastDocument);
      }

      it("streams any inserted documents", async function (this: AppContext & Mocha.Context) {
        await Promise.all([
          insertDocumentsOneByOne(),
          (async () => {
            let expectedId = 0;
            for await (const event of collection.watch()) {
              assertIsInsert(event.operationType);
              expect(event.fullDocument._id).to.equal(expectedId++);
              if (event.fullDocument.isLast) break;
            }
            expect(expectedId).to.equal(numInserts);
          })(),
        ]);
      });

      it("streams inserted documents using 'filter' option", async function (this: AppContext & Mocha.Context) {
        await Promise.all([
          insertDocumentsOneByOne(),
          (async () => {
            const watchedId = 3;
            const filter = { $or: [{ "fullDocument._id": watchedId, "fullDocument.text": text }, { "fullDocument.isLast": true }] };
            let seenIt = false;
            for await (const event of collection.watch({ filter })) {
              assertIsInsert(event.operationType);
              if (event.fullDocument.isLast) break;
              expect(event.fullDocument._id).to.equal(watchedId);
              seenIt = true;
            }
            expect(seenIt).to.be.true;
          })(),
        ]);
      });

      it("streams inserted documents using 'ids' option", async function (this: AppContext & Mocha.Context) {
        await Promise.all([
          insertDocumentsOneByOne(),
          (async () => {
            const watchedId = 5;
            let seenIt = false;
            for await (const event of collection.watch({ ids: [watchedId, lastDocument._id] })) {
              assertIsInsert(event.operationType);
              if (event.fullDocument.isLast) break;
              expect(event.fullDocument._id).to.equal(watchedId);
              seenIt = true;
            }
            expect(seenIt).to.be.true;
          })(),
        ]);
      });

      it("throws when the user is logged out", async function (this: AppContext & Mocha.Context) {
        throw new Error("Test not yet implemented.");
      });
    });
  });
});
