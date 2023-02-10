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
import { ChangeEvent, Document, InsertEvent, MongoDBCollection } from "realm";

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

  const serviceName = "mongo-db";
  const dbName = "test-database";
  const collectionName = "test-collection";

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
  });

  describe("MongoDBCollection", function () {
    let collection: MongoDBCollection<TestDocument>;

    function getCollection<T extends Document = TestDocument>(currentUser: User | null): MongoDBCollection<T> {
      if (!currentUser) {
        throw new Error("A user must be authenticated before getting a MongoDB collection.");
      }
      return currentUser.mongoClient(serviceName).db(dbName).collection<T>(collectionName);
    }

    function deleteAllDocuments() {
      return collection.deleteMany();
    }

    before(function (this: AppContext & Mocha.Context) {
      collection = getCollection(this.app.currentUser);
    });

    beforeEach(async function () {
      await deleteAllDocuments();
    });

    after(async function () {
      await deleteAllDocuments();
    });

    describe("#watch", function () {
      const sleep = async (time: number) => new Promise((resolve) => setInterval(resolve, time));
      const text = "use some odd chars to force weird encoding %\n\r\n\\????>>>>";
      const numInserts = 10;
      // Used as a flag for knowing when to stop watching.
      const lastDocument = { _id: numInserts, isLast: true };

      function assertIsInsert<
        T extends Document = TestDocument,
      >(event: ChangeEvent<T>): asserts event is InsertEvent<T> {
        if (event.operationType !== "insert") {
          throw new Error(`Expected an insert event, got ${event}.`);
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
              assertIsInsert(event);
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
            const filter = {
              $or: [{ "fullDocument._id": watchedId, "fullDocument.text": text }, { "fullDocument.isLast": true }],
            };
            let seenIt = false;
            for await (const event of collection.watch({ filter })) {
              assertIsInsert(event);
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
            const watchedId = 3;
            let seenIt = false;
            for await (const event of collection.watch({ ids: [watchedId, lastDocument._id] })) {
              assertIsInsert(event);
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

        await this.app.currentUser?.logOut();
        const handleWatch = async () => {
          try {
            for await (const _ of collection.watch()) {
              expect.fail("Expected 'watch()' to throw, but received a change stream.");
            }
          } catch (err) {
            return err;
          } finally {
            // TODO:
            // Should we log in again reset our `collection` variable in case other tests
            // are run after this test?
          }
        };

        const CODE_UNAUTHORIZED = 401;
        const err = await handleWatch();
        expect(err).to.be.an("object");
        expect(err).to.have.property("code", CODE_UNAUTHORIZED);
      });
    });
  });
});
