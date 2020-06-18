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

"use strict";

const {DefaultNetworkTransport} = require('realm-network-transport');

/**
 * A remote collection of documents.
 */
class RemoteMongoDBCollection {

    /**
     * Construct a remote collection of documents
     */
    constructor(
        user,
        serviceName,
        databaseName,
        collectionName,
    ) {
        this.functions = user._functionsOnService(serviceName);
        this.databaseName = databaseName;
        this.collectionName = collectionName;
        this.user = user;
        this.serviceName = serviceName;
    }

    /** @inheritdoc */
    find(
        filter = {},
        options = {},
    ) {
        return this.functions.find({
            database: this.databaseName,
            collection: this.collectionName,
            query: filter,
            project: options.projection,
            sort: options.sort,
            limit: options.limit,
        });
    }

    /** @inheritdoc */
    findOne(
        filter = {},
        options = {},
    ) {
        return this.functions.findOne({
            database: this.databaseName,
            collection: this.collectionName,
            query: filter,
            project: options.projection,
            sort: options.sort,
        });
    }

    /** @inheritdoc */
    findOneAndUpdate(
        filter = {},
        update,
        options = {},
    ) {
        return this.functions.findOneAndUpdate({
            database: this.databaseName,
            collection: this.collectionName,
            filter: filter,
            update: update,
            sort: options.sort,
            projection: options.projection,
            upsert: options.upsert,
            returnNewDocument: options.returnNewDocument,
        });
    }

    /** @inheritdoc */
    findOneAndReplace(
        filter = {},
        replacement,
        options = {},
    ) {
        return this.functions.findOneAndReplace({
            database: this.databaseName,
            collection: this.collectionName,
            filter: filter,
            update: replacement,
            sort: options.sort,
            projection: options.projection,
            upsert: options.upsert,
            returnNewDocument: options.returnNewDocument,
        });
    }

    /** @inheritdoc */
    findOneAndDelete(
        filter = {},
        options = {},
    ) {
        return this.functions.findOneAndReplace({
            database: this.databaseName,
            collection: this.collectionName,
            filter: filter,
            sort: options.sort,
            projection: options.projection,
        });
    }

    /** @inheritdoc */
    aggregate(pipeline) {
        return this.functions.aggregate({
            database: this.databaseName,
            collection: this.collectionName,
            pipeline: pipeline,
        });
    }

    /** @inheritdoc */
    count(
        filter = {},
        options = {},
    ) {
        return this.functions.count({
            database: this.databaseName,
            collection: this.collectionName,
            query: filter,
            limit: options.limit,
        });
    }

    /** @inheritdoc */
    insertOne(document) {
        return this.functions.insertOne({
            database: this.databaseName,
            collection: this.collectionName,
            document,
        });
    }

    /** @inheritdoc */
    insertMany(documents) {
        return this.functions.insertMany({
            database: this.databaseName,
            collection: this.collectionName,
            documents: documents,
        });
    }

    /** @inheritdoc */
    deleteOne(filter = {}) {
        return this.functions.deleteOne({
            database: this.databaseName,
            collection: this.collectionName,
            query: filter,
        });
    }

    /** @inheritdoc */
    deleteMany(filter = {}) {
        return this.functions.deleteMany({
            database: this.databaseName,
            collection: this.collectionName,
            query: filter,
        });
    }

    /** @inheritdoc */
    updateOne(
        filter,
        update,
        options = {},
    ) {
        return this.functions.updateOne({
            database: this.databaseName,
            collection: this.collectionName,
            query: filter,
            update,
            upsert: options.upsert,
        });
    }

    /** @inheritdoc */
    updateMany(
        filter,
        update,
        options = {},
    ) {
        return this.functions.updateMany({
            database: this.databaseName,
            collection: this.collectionName,
            query: filter,
            update,
            upsert: options.upsert,
        });
    }

    async* watch({ids = undefined, filter = undefined} = {}) {
        let args = {
            database: this.databaseName,
            collection: this.collectionName,
            ids,
            filter,
        };

        const request = this.user._makeStreamingRequest("watch", this.serviceName, this.user._cleanArgs([args]));
        const reply = await (new DefaultNetworkTransport().fetch(request));
        if (!reply.ok) {
            throw {code: reply.status, message: await reply.text()};
        }

        let watchStream = this.user._newWatchStream();
        for await (let chunk of reply.body) {
            watchStream.feedBuffer(chunk);
            while (watchStream.state == 'HAVE_EVENT') {
                let next = watchStream.nextEvent();
                yield next;
            }
            if (watchStream.state == 'HAVE_ERROR')
                throw watchStream.error;
        }
    }
}

module.exports = { RemoteMongoDBCollection };
