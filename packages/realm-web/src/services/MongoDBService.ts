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

import { Fetcher } from "../Fetcher";
import { FunctionsFactory, cleanArgs } from "../FunctionsFactory";
import { EJSON } from "bson";
import { getEnvironment } from "../environment"

type Document = Realm.Services.MongoDB.Document;
type NewDocument<T extends Document> = Realm.Services.MongoDB.NewDocument<T>;
type ChangeEvent<T extends Document> = Realm.Services.MongoDB.ChangeEvent<T>;

type ServerSentEvent = {
    data: string;
    eventType?: string;
};

// NOTE: this is a fully processed event, not a single "data: foo" line!
export enum StreamState {
    NEED_DATA = 'NEED_DATA',   // Need to call one of the feed functions.
    HAVE_EVENT = 'HAVE_EVENT', // Call nextEvent() to consume an event.
    HAVE_ERROR = 'HAVE_ERROR', // Call error().
};

function asyncIterForReadableStream(stream: any): AsyncIterable<Uint8Array> {
    if (Symbol.asyncIterator in stream)
        return stream as AsyncIterable<Uint8Array>;
    return {
        [Symbol.asyncIterator]() {
            let reader = stream.getReader();
            return {
                next() {
                    return reader.read();
                },
                async return() {
                    await reader.cancel();
                    return {done: true, value: null};
                },
            }
        }
    }
}

export class WatchStream<T extends Document> {
    // Call these when you have data, in whatever shape is easiest for your SDK to get.
    // Pick one, mixing and matching on a single instance isn't supported.
    // These can only be called in NEED_DATA state, which is the initial state.
    feedBuffer(buffer: Uint8Array) {
        this.assertState(StreamState.NEED_DATA);
        this._buffer += this._textDecoder.decode(buffer, {stream: true});
        this.advanceBufferState();
    }

    feedLine(line: string) {
        this.assertState(StreamState.NEED_DATA);
        // This is an implementation of the algorithm described at
        // https://html.spec.whatwg.org/multipage/server-sent-events.html#event-stream-interpretation.
        // Currently the server does not use id or retry lines, so that processing isn't implemented.

        // ignore trailing LF if not removed by SDK.
        if (line.endsWith('\n'))
            line = line.substr(0, line.length - 1);

        // ignore trailing CR from CRLF
        if (line.endsWith('\r'))
            line = line.substr(0, line.length - 1);

        if (line.length == 0) {
            // This is the "dispatch the event" portion of the algorithm.
            if (this._data_buffer.length == 0) {
                this._event_type = "";
                return;
            }

            if (this._data_buffer.endsWith('\n'))
                this._data_buffer = this._data_buffer.substr(0, this._data_buffer.length - 1)

            this.feedSse({data: this._data_buffer, eventType: this._event_type});
            this._data_buffer = "";
            this._event_type = "";
        }

        if (line[0] == ':')
            return;

        const colon = line.indexOf(':');
        const field = line.substr(0, colon);
        let value = colon == -1 ? '' : line.substr(colon + 1);
        if (value.startsWith(' '))
            value = value.substr(1);

        if (field == "event") {
            this._event_type = value;
        } else if (field == "data") {
            this._data_buffer += value;
            this._data_buffer += '\n';
        } else {
            // line is ignored (even if field is id or retry).
        }
    }

    feedSse(sse: ServerSentEvent) {
        this.assertState(StreamState.NEED_DATA);
        let first_percent = sse.data.indexOf('%');
        if (first_percent != -1) {
            // For some reason, the stich server decided to add percent-encoding for '%', '\n', and '\r' to its
            // event-stream replies. But it isn't real urlencoding, since most characters pass through, so we can't use
            // uri_percent_decode() here.
            let buffer = ''
            let start = 0;
            while (true) {
                let percent = start == 0 ? first_percent : sse.data.indexOf('%', start);
                if (percent == -1) {
                    buffer += sse.data.substr(start);
                    break;
                }

                buffer += sse.data.substr(start, percent - start);

                let encoded = sse.data.substr(percent, 3); // may be smaller than 3 if string ends with %
                if (encoded == "%25") {
                    buffer += '%';
                } else if (encoded == "%0A") {
                    buffer += '\x0A'; // '\n'
                } else if (encoded == "%0D") {
                    buffer += '\x0D'; // '\r'
                } else {
                    buffer += encoded; // propagate as-is
                }
                start = percent + encoded.length;
            }

            sse.data = buffer;
        }

        if (sse.eventType === undefined || sse.eventType.length == 0 || sse.eventType == "message") {
            try {
                let parsed = EJSON.parse(sse.data);
                if (typeof parsed == 'object') { // ???
                    this._nextEvent = parsed;
                    this._state = StreamState.HAVE_EVENT;
                    return;
                }
            } catch {
                // fallthrough to same handling as for non-document value.
            }
            this._state = StreamState.HAVE_ERROR;
            this._error = {err: "bad bson parse", message: "server returned malformed event: " + sse.data}
        } else if (sse.eventType == "error") {
            this._state = StreamState.HAVE_ERROR;

            // default error message if we have issues parsing the reply.
            this._error = {err: "unknown", message: sse.data}
            try {
                const {error_code, error}= EJSON.parse(sse.data) as any; 
                if (typeof error_code != 'string') return;
                if (typeof error != 'string') return;
                // XXX in realm-js, object-store will error if the error_code is not one of the known
                // error code enum values.
                this._error = {err: error_code, message: error};
            } catch {
                return; // Use the default state.
            }
        } else {
            // Ignore other event types
        }

    }

    get state() { return this._state; }

    // Consumes the returned event. If you used feedBuffer(), there may be another event or error after this one,
    // so you need to call state() again to see what to do next.
    nextEvent() {
        this.assertState(StreamState.HAVE_EVENT);
        const out = this._nextEvent;
        this._state = StreamState.NEED_DATA;
        this.advanceBufferState();
        return out;
    }

    // Once this enters the error state, it stays that way. You should not feed any more data.
    get error() { return this._error; }

    ////////////////////////////////////////////

    private advanceBufferState() {
        this.assertState(StreamState.NEED_DATA);
        while (this.state == StreamState.NEED_DATA) {
            if (this._bufferOffset == this._buffer.length) {
                this._buffer = "";
                this._bufferOffset = 0;
                return;
            }

            // NOTE not supporting CR-only newlines, just LF and CRLF.
            const next_newline = this._buffer.indexOf('\n', this._bufferOffset);
            if (next_newline == -1) {
                // We have a partial line.
                if (this._bufferOffset != 0) {
                    // Slide the partial line down to the front of the buffer.
                    this._buffer = this._buffer.substr(this._bufferOffset, this._buffer.length - this._bufferOffset);
                    this._bufferOffset = 0;
                }
                return;
            }

            this.feedLine(this._buffer.substr(this._bufferOffset, next_newline - this._bufferOffset));
            this._bufferOffset = next_newline + 1; // Advance past this line, including its newline.
        }
    }

    private assertState(state: StreamState) {
        if (this._state != state) {
            throw Error(`Expected WatchStream to be in state ${state}, but in state ${this._state}`);
        }
    }

    private _nextEvent?: object;

    private _state: StreamState = StreamState.NEED_DATA;

    private _error: any = null;

    // Used by feedBuffer to construct lines
    private _textDecoder = getEnvironment().makeTextDecoder();
    private _buffer = "";
    private _bufferOffset = 0;

    // Used by feedLine for building the next SSE
    private _event_type = "";
    private _data_buffer = "";
}

/**
 * A remote collection of documents.
 */
class MongoDBCollection<T extends Document>
    implements Realm.Services.MongoDB.MongoDBCollection<T> {
    /**
     * The function factory to use when sending requests to the service.
     */
    private functions: Realm.DefaultFunctionsFactory;

    /**
     * The name of the database.
     */
    private readonly databaseName: string;

    /**
     * The name of the collection.
     */
    private readonly collectionName: string;

    private readonly serviceName: string;
    private readonly fetcher: Fetcher;

    /**
     * Construct a remote collection of documents.
     *
     * @param fetcher The fetcher to use when requesting the service.
     * @param serviceName The name of the remote service.
     * @param databaseName The name of the database.
     * @param collectionName The name of the remote collection.
     */
    constructor(
        fetcher: Fetcher,
        serviceName: string,
        databaseName: string,
        collectionName: string,
    ) {
        this.functions = FunctionsFactory.create(fetcher, {
            serviceName,
        });
        this.databaseName = databaseName;
        this.collectionName = collectionName;
        this.serviceName = serviceName;
        this.fetcher = fetcher;
    }

    /** @inheritdoc */
    find(
        filter: Realm.Services.MongoDB.Filter = {},
        options: Realm.Services.MongoDB.FindOptions = {},
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
        filter: Realm.Services.MongoDB.Filter = {},
        options: Realm.Services.MongoDB.FindOneOptions = {},
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
        filter: Realm.Services.MongoDB.Filter = {},
        update: Realm.Services.MongoDB.Update,
        options: Realm.Services.MongoDB.FindOneAndModifyOptions = {},
    ) {
        return this.functions.findOneAndUpdate({
            database: this.databaseName,
            collection: this.collectionName,
            filter,
            update,
            sort: options.sort,
            projection: options.projection,
            upsert: options.upsert,
            returnNewDocument: options.returnNewDocument,
        });
    }

    /** @inheritdoc */
    findOneAndReplace(
        filter: Realm.Services.MongoDB.Filter = {},
        replacement: NewDocument<T>,
        options: Realm.Services.MongoDB.FindOneAndModifyOptions = {},
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
        filter: Realm.Services.MongoDB.Filter = {},
        options: Realm.Services.MongoDB.FindOneOptions = {},
    ) {
        return this.functions.findOneAndReplace({
            database: this.databaseName,
            collection: this.collectionName,
            filter,
            sort: options.sort,
            projection: options.projection,
        });
    }

    /** @inheritdoc */
    aggregate(pipeline: Realm.Services.MongoDB.AggregatePipelineStage[]) {
        return this.functions.aggregate({
            database: this.databaseName,
            collection: this.collectionName,
            pipeline,
        });
    }

    /** @inheritdoc */
    count(
        filter: Realm.Services.MongoDB.Filter = {},
        options: Realm.Services.MongoDB.CountOptions = {},
    ) {
        return this.functions.count({
            database: this.databaseName,
            collection: this.collectionName,
            query: filter,
            limit: options.limit,
        });
    }

    /** @inheritdoc */
    insertOne(document: NewDocument<T>) {
        return this.functions.insertOne({
            database: this.databaseName,
            collection: this.collectionName,
            document,
        });
    }

    /** @inheritdoc */
    insertMany(documents: NewDocument<T>[]) {
        return this.functions.insertMany({
            database: this.databaseName,
            collection: this.collectionName,
            documents,
        });
    }

    /** @inheritdoc */
    deleteOne(filter: Realm.Services.MongoDB.Filter = {}) {
        return this.functions.deleteOne({
            database: this.databaseName,
            collection: this.collectionName,
            query: filter,
        });
    }

    /** @inheritdoc */
    deleteMany(filter: Realm.Services.MongoDB.Filter = {}) {
        return this.functions.deleteMany({
            database: this.databaseName,
            collection: this.collectionName,
            query: filter,
        });
    }

    /** @inheritdoc */
    updateOne(
        filter: Realm.Services.MongoDB.Filter,
        update: Realm.Services.MongoDB.Update,
        options: Realm.Services.MongoDB.UpdateOptions = {},
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
        filter: Realm.Services.MongoDB.Filter,
        update: Realm.Services.MongoDB.Update,
        options: Realm.Services.MongoDB.UpdateOptions = {},
    ) {
        return this.functions.updateMany({
            database: this.databaseName,
            collection: this.collectionName,
            query: filter,
            update,
            upsert: options.upsert,
        });
    }

    /** @inheritdoc */
    async* watch(
        {ids = undefined, filter = undefined}: {ids?: T["_id"][], filter?: Realm.Services.MongoDB.Filter}  = {},
    ): AsyncGenerator<ChangeEvent<T>> {
        let args = {
            database: this.databaseName,
            collection: this.collectionName,
            ids,
            filter,
        };
        const reply = await this.fetcher.fetch(
            this.fetcher.makeStreamingRequest(
                "watch",
                cleanArgs([args]),
                this.serviceName));
        let watchStream = new WatchStream<T>();
        for await (let chunk of asyncIterForReadableStream(reply.body)) {
            if (!chunk) continue;
            watchStream.feedBuffer(chunk);
            while (watchStream.state == StreamState.HAVE_EVENT) {
                let next = watchStream.nextEvent() as Realm.Services.MongoDB.ChangeEvent<T>;
                yield next;
            }
            if (watchStream.state == StreamState.HAVE_ERROR)
                // XXX this is just throwing an error like {error_code: "BadRequest, error: "message"},
                // which matches realm-js, but is different from how errors are handled in realm-web
                throw watchStream.error;
        }
    }
}

/**
 * Creates an Remote MongoDB Collection.
 * Note: This method exists to enable function binding.
 *
 * @param fetcher The underlying fetcher.
 * @param serviceName A service name.
 * @param databaseName A database name.
 * @param collectionName A collection name.
 * @returns The collection.
 */
export function createCollection<
    T extends Realm.Services.MongoDB.Document = any
>(
    fetcher: Fetcher,
    serviceName: string,
    databaseName: string,
    collectionName: string,
): MongoDBCollection<T> {
    return new MongoDBCollection<T>(
        fetcher,
        serviceName,
        databaseName,
        collectionName,
    );
}

/**
 * Creates a Remote MongoDB Database.
 * Note: This method exists to enable function binding.
 *
 * @param fetcher The underlying fetcher
 * @param serviceName A service name
 * @param databaseName A database name
 * @returns The database.
 */
export function createDatabase(
    fetcher: Fetcher,
    serviceName: string,
    databaseName: string,
): Realm.Services.MongoDBDatabase {
    return {
        collection: createCollection.bind(
            null,
            fetcher,
            serviceName,
            databaseName,
        ) as Realm.Services.MongoDBDatabase["collection"],
    };
}

/**
 * Creates a Remote MongoDB Service.
 * Note: This method exists to enable function binding.
 *
 * @param fetcher The underlying fetcher.
 * @param serviceName An optional service name.
 * @returns The service.
 */
export function createService(fetcher: Fetcher, serviceName = "mongo-db") {
    return { db: createDatabase.bind(null, fetcher, serviceName) };
}
