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
import { ObjectID } from "bson";

import { createService } from "./RemoteMongoDBService";
import { MockTransport } from "../test/MockTransport";

/** A test interface that documents in my-collection implements */
interface MyDocument extends Realm.Services.RemoteMongoDB.Document {
    /** The name of the thing ... */
    name: string;
}

describe("MongoDB Remote service", () => {
    it("can find documents", async () => {
        const transport = new MockTransport([
            [
                {
                    _id: {
                        $oid: "deadbeefdeadbeefdeadbeef",
                    },
                    name: "Some document name ...",
                },
            ],
        ]);
        const service = createService(transport, "my-mongodb-service");
        const result = await service
            .db("my-database")
            .collection<MyDocument>("my-collection")
            .find(
                {
                    _id: ObjectID.createFromHexString(
                        "deadbeefdeadbeefdeadbeef",
                    ),
                },
                { limit: 10 },
            );
        // Expect the service to issue a request via the functions factory
        expect(transport.requests).deep.equals([
            {
                method: "POST",
                body: {
                    service: "my-mongodb-service",
                    name: "find",
                    arguments: [
                        {
                            database: "my-database",
                            collection: "my-collection",
                            limit: 10,
                            query: {
                                _id: { $oid: "deadbeefdeadbeefdeadbeef" },
                            },
                        },
                    ],
                },
                url: "http://localhost:1337/functions/call",
            },
        ]);
        // TODO: Expect something about the findResult
        expect(typeof result).equals("object");
        const [firstDocument] = result;
        // Expect that the first document is EJSON deserialized
        expect(typeof firstDocument).equals("object");
        expect(typeof firstDocument._id).equals("object");
        expect(firstDocument._id.constructor.name).equals("ObjectId");
        expect(firstDocument.name).equals("Some document name ...");
    });

    it("can find one document", async () => {
        const transport = new MockTransport([
            {
                _id: {
                    $oid: "deadbeefdeadbeefdeadbeef",
                },
                name: "Some document name ...",
            },
        ]);
        const service = createService(transport, "my-mongodb-service");
        const result = await service
            .db("my-database")
            .collection<MyDocument>("my-collection")
            .findOne(
                {
                    _id: ObjectID.createFromHexString(
                        "deadbeefdeadbeefdeadbeef",
                    ),
                },
                {
                    projection: { name: 1 },
                    sort: { name: 1 },
                },
            );
        // Expect the service to issue a request via the functions factory
        expect(transport.requests).deep.equals([
            {
                method: "POST",
                body: {
                    service: "my-mongodb-service",
                    name: "findOne",
                    arguments: [
                        {
                            database: "my-database",
                            collection: "my-collection",
                            sort: { name: 1 },
                            project: { name: 1 },
                            query: {
                                _id: { $oid: "deadbeefdeadbeefdeadbeef" },
                            },
                        },
                    ],
                },
                url: "http://localhost:1337/functions/call",
            },
        ]);
        // TODO: Expect something about the findResult
        expect(typeof result).equals("object");
        // Expect that the first document is EJSON deserialized
        expect(typeof result).equals("object");
        expect(typeof result._id).equals("object");
        expect(result._id.constructor.name).equals("ObjectId");
        expect(result.name).equals("Some document name ...");
    });

    it("can insert a document", async () => {
        const transport = new MockTransport([
            {
                insertedId: { $oid: "deadbeefdeadbeefdeadbeef" },
            },
        ]);
        const service = createService(transport, "my-mongodb-service");
        const result = await service
            .db("my-database")
            .collection<MyDocument>("my-collection")
            .insertOne({ name: "My awesome new document" });
        expect(typeof result).equals("object");
        expect(typeof result.insertedId).equals("object");
        expect(result.insertedId.constructor.name).equals("ObjectId");

        expect(transport.requests).deep.equals([
            {
                method: "POST",
                body: {
                    service: "my-mongodb-service",
                    name: "insertOne",
                    arguments: [
                        {
                            database: "my-database",
                            collection: "my-collection",
                            document: { name: "My awesome new document" },
                        },
                    ],
                },
                url: "http://localhost:1337/functions/call",
            },
        ]);
    });

    it("can insert many documents", async () => {
        const transport = new MockTransport([
            {
                insertedIds: [
                    { $oid: "deadbeefdeadbeefdead0001" },
                    { $oid: "deadbeefdeadbeefdead0002" },
                ],
            },
        ]);
        const service = createService(transport, "my-mongodb-service");
        const result = await service
            .db("my-database")
            .collection<MyDocument>("my-collection")
            .insertMany([
                { name: "My first document" },
                { name: "My second document" },
            ]);
        expect(typeof result).equals("object");
        expect(Array.isArray(result.insertedIds));
        for (const id of result.insertedIds) {
            expect(typeof id).equals("object");
            expect(id.constructor.name).equals("ObjectId");
        }

        expect(transport.requests).deep.equals([
            {
                method: "POST",
                body: {
                    service: "my-mongodb-service",
                    name: "insertMany",
                    arguments: [
                        {
                            database: "my-database",
                            collection: "my-collection",
                            documents: [
                                { name: "My first document" },
                                { name: "My second document" },
                            ],
                        },
                    ],
                },
                url: "http://localhost:1337/functions/call",
            },
        ]);
    });

    it("can count documents", async () => {
        const transport = new MockTransport([{ $numberLong: "1337" }]);
        const service = createService(transport, "my-mongodb-service");
        const result = await service
            .db("my-database")
            .collection<MyDocument>("my-collection")
            .count({}, { limit: 9999 });
        expect(result).equals(1337);
        expect(transport.requests).deep.equals([
            {
                method: "POST",
                body: {
                    service: "my-mongodb-service",
                    name: "count",
                    arguments: [
                        {
                            database: "my-database",
                            collection: "my-collection",
                            limit: 9999,
                            query: {},
                        },
                    ],
                },
                url: "http://localhost:1337/functions/call",
            },
        ]);
    });
});
