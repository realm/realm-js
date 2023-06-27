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

import { Fetcher } from "../../Fetcher";
import { MongoDBCollection } from "./MongoDBCollection";

/**
 * A remote MongoDB Service enables access to a MongoDB Atlas cluster.
 */
export type MongoDBService = {
  db(name: string): ReturnType<typeof createDatabase>;
};

export { MongoDBCollection };

/**
 * Creates an Remote MongoDB Collection.
 * Note: This method exists to enable function binding.
 * @param fetcher The underlying fetcher.
 * @param serviceName A service name.
 * @param databaseName A database name.
 * @param collectionName A collection name.
 * @returns The collection.
 */
function createCollection<T extends Realm.Services.MongoDB.Document = Realm.Services.MongoDB.Document<unknown>>(
  fetcher: Fetcher,
  serviceName: string,
  databaseName: string,
  collectionName: string,
): MongoDBCollection<T> {
  return new MongoDBCollection<T>(fetcher, serviceName, databaseName, collectionName);
}

/**
 * Creates a Remote MongoDB Database.
 * Note: This method exists to enable function binding.
 * @param fetcher The underlying fetcher
 * @param serviceName A service name
 * @param databaseName A database name
 * @returns The database.
 */
function createDatabase(fetcher: Fetcher, serviceName: string, databaseName: string): Realm.Services.MongoDBDatabase {
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
 * @param fetcher The underlying fetcher.
 * @param serviceName An optional service name.
 * @returns The service.
 */
export function createService(fetcher: Fetcher, serviceName = "mongo-db"): MongoDBService {
  return { db: createDatabase.bind(null, fetcher, serviceName) };
}
