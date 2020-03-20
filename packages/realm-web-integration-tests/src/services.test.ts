import { expect } from "chai";

import { Credentials } from "realm-web";

import { createApp } from "./utils";

interface TestDocument {
    name: string;
}

describe("App services", () => {
    describe("remote MongoDB", () => {
        it("can find documents", async () => {
            const app = createApp();
            // Login a user
            const credentials = Credentials.anonymous();
            await app.logIn(credentials);
            // Call a function
            const mongodb = app.services.mongodb("local-mongodb");
            const db = mongodb.db("test-database");
            const collection = db.collection<TestDocument>("test-collection");
            const result = await collection.find({}, { limit: 10 });
            if (result.length > 0) {
                const [firstDocument] = result;
                expect(typeof firstDocument._id).equal("object");
                expect(firstDocument._id.constructor.name).equal("ObjectId");
            }
        });

        it("can count documents, insert a document and count + retrieve it again", async () => {
            const app = createApp();
            // Login a user
            const credentials = Credentials.anonymous();
            await app.logIn(credentials);
            // Call a function
            const mongodb = app.services.mongodb("local-mongodb");
            const db = mongodb.db("test-database");
            const collection = db.collection<TestDocument>("test-collection");
            // Determine the number of documents before insertion
            const countBefore = await collection.count();
            // Insert a document
            const insertResult = await collection.insertOne({
                name: "Some test document ..."
            });
            expect(typeof insertResult.insertedId).equals("object");
            expect(insertResult.insertedId.constructor.name).equal("ObjectId");
            // Determine the number of documents after insertion
            const countAfter = await collection.count();
            expect(countAfter - countBefore).equals(1);
            // Try to retrieve it again
            const findResult = await collection.findOne({
                _id: { $eq: insertResult.insertedId }
            });
            // Expect a result with a similar object id
            expect(findResult).deep.equals({
                _id: insertResult.insertedId,
                name: "Some test document ..."
            });
        });

        it("can insert many documents", async () => {
            const app = createApp();
            // Login a user
            const credentials = Credentials.anonymous();
            await app.logIn(credentials);
            // Call a function
            const mongodb = app.services.mongodb("local-mongodb");
            const db = mongodb.db("test-database");
            const collection = db.collection<TestDocument>("test-collection");
            // Determine the number of documents before insertion
            const countBefore = await collection.count();
            // Insert a document
            const insertResult = await collection.insertMany([
                { name: "My first document" },
                { name: "My second document" }
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
    });
});
