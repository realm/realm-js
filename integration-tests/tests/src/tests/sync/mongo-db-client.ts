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
import { ChangeEvent, Credentials, DeleteResult, Document, InsertEvent, MongoDBCollection, User } from "realm";

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
    describe("#watch", function () {
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
