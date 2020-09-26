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

import { Long, Timestamp } from "bson";

/**
 * A document from a MongoDB collection
 */
export interface Document<IdType = any> {
    /**
     * The id of the document.
     */
    _id: IdType;
}

/**
 * An operation performed on a document.
 */
export type OperationType =
    /** A document got inserted into the collection. */
    | "insert"
    /** A document got deleted from the collection. */
    | "delete"
    /** A document got replaced in the collection. */
    | "replace"
    /** A document got updated in the collection. */
    | "update"
    /** Occurs when a collection is dropped from a database. */
    | "drop"
    /** Occurs when a collection is renamed. */
    | "rename"
    /** Occurs when a database is dropped. */
    | "dropDatabase"
    /** Invalidate events close the change stream cursor. */
    | "invalidate";

/**
 * The namespace of a document.
 */
type DocumentNamespace = {
    /** The name of the database. */
    db: string;
    // database: string;
    /** The name of the collection. */
    coll: string;
    // collection: string;
};

/**
 * A detailed description of an update performed on a document.
 */
type UpdateDescription = {
    /** Names of fields that got updated. */
    updatedFields: Record<string, any>;
    /** Names of fields that got removed. */
    removedFields: string[];
};

/**
 * Acts as the `resumeToken` for the `resumeAfter` parameter when resuming a change stream.
 */
type ChangeEventId = any;

/**
 * A document that contains the _id of the document created or modified by the insert, replace, delete, update operations (i.e. CRUD operations). For sharded collections, also displays the full shard key for the document. The _id field is not repeated if it is already a part of the shard key.
 */
type DocumentKey<IdType> = {
    /** The id of the document. */
    _id: IdType;
} & Record<string, any>;

/**
 * A base change event containing the properties which apply across operation types.
 */
type BaseChangeEvent<T extends OperationType> = {
    /** The id of the change event. */
    _id: ChangeEventId;
    /** The type of operation which was performed on the document. */
    operationType: T;
    /** The timestamp from the oplog entry associated with the event. */
    clusterTime: Timestamp;
    /**
     * The transaction number.
     * Only present if the operation is part of a multi-document transaction.
     */
    txnNumber?: Long;
    /**
     * The identifier for the session associated with the transaction.
     * Only present if the operation is part of a multi-document transaction.
     */
    lsid?: object;
};

/**
 * A document got inserted into the collection.
 */
export type InsertEvent<T extends Document> = {
    /** The namespace (database and collection) of the document got inserted into. */
    ns: DocumentNamespace;
    /** A document that contains the _id of the inserted document. */
    documentKey: DocumentKey<T["_id"]>;
    /** The new document created by the operation */
    fullDocument: T;
} & BaseChangeEvent<"insert">;

/**
 * A document got updated in the collection.
 */
export type UpdateEvent<T extends Document> = {
    /** The namespace (database and collection) of the updated document. */
    ns: DocumentNamespace;
    /** A document that contains the _id of the updated document. */
    documentKey: DocumentKey<T["_id"]>;
    /** A document describing the fields that were updated or removed. */
    updateDescription: UpdateDescription;
    /**
     * For change streams opened with the `fullDocument: updateLookup` option, this will represents the most current majority-committed version of the document modified by the update operation.
     */
    fullDocument?: T;
} & BaseChangeEvent<"update">;

/**
 * A document got replaced in the collection.
 */
export type ReplaceEvent<T extends Document> = {
    /** The namespace (database and collection) of the document got replaced within. */
    ns: DocumentNamespace;
    /** A document that contains the _id of the replaced document. */
    documentKey: DocumentKey<T["_id"]>;
    /** The document after the insert of the replacement document. */
    fullDocument: T;
} & BaseChangeEvent<"replace">;

/**
 * A document got deleted from the collection.
 */
export type DeleteEvent<T extends Document> = {
    /** The namespace (database and collection) which the document got deleted from. */
    ns: DocumentNamespace;
    /** A document that contains the _id of the deleted document. */
    documentKey: DocumentKey<T["_id"]>;
} & BaseChangeEvent<"delete">;

/**
 * Occurs when a collection is dropped from a database.
 */
export type DropEvent = {
    /** The namespace (database and collection) of the collection that got dropped. */
    ns: DocumentNamespace;
} & BaseChangeEvent<"drop">;

/**
 * Occurs when a collection is renamed.
 */
export type RenameEvent = {
    /** The original namespace (database and collection) that got renamed. */
    ns: DocumentNamespace;
    /** The namespace (database and collection) going forward. */
    to: DocumentNamespace;
} & BaseChangeEvent<"rename">;

/**
 * Occurs when a database is dropped.
 */
export type DropDatabaseEvent = {
    /** The namespace (specifying only the database name) of the database that got dropped. */
    ns: Omit<DocumentNamespace, "coll">;
} & BaseChangeEvent<"dropDatabase">;

/**
 * Invalidate events close the change stream cursor.
 */
export type InvalidateEvent = BaseChangeEvent<"invalidate">;

/**
 * Represents a change event communicated via a MongoDB change stream.
 *
 * @see https://docs.mongodb.com/manual/reference/change-events/
 */
export type ChangeEvent<T extends Document> =
    | InsertEvent<T>
    | UpdateEvent<T>
    | ReplaceEvent<T>
    | DeleteEvent<T>
    | DropEvent
    | RenameEvent
    | DropDatabaseEvent
    | InvalidateEvent;