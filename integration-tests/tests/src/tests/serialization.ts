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
import Realm from "realm";

import {
  IPlaylist as IPlaylistNoId,
  ISong as ISongNoId,
  PlaylistSchema as PlaylistSchemaNoId,
  SongSchema as SongSchemaNoId,
  Playlist as PlaylistNoId,
  Song as SongNoId,
} from "../schemas/playlist-with-songs";
import {
  IPlaylist as IPlaylistWithId,
  ISong as ISongWithId,
  PlaylistSchema as PlaylistSchemaWithId,
  SongSchema as SongSchemaWithId,
  Playlist as PlaylistWithId,
  Song as SongWithId,
} from "../schemas/playlist-with-songs-with-ids";
import circularCollectionResult from "../structures/circular-collection-result.json";
import circularCollectionResultWithIds from "../structures/circular-collection-result-with-primary-ids.json";
import { openRealmBeforeEach } from "../hooks";

describe("JSON serialization (exposed properties)", () => {
  it("JsonSerializationReplacer is exposed on the Realm constructor", () => {
    expect(typeof Realm.JsonSerializationReplacer).equals("function");
    expect(Realm.JsonSerializationReplacer.length).equals(2);
  });
});

type TestSetup = {
  name: string;
  schema: (Realm.ObjectSchema | Realm.ObjectClass)[];
  testData: (realm: Realm) => unknown;
};

interface ICacheIdTestSetup {
  type: string;
  schemaName: string;
  testId: unknown;
  expectedResult: string;
}

/**
 * Create test data (TestSetups) in 4 ways, with the same data structure:
 * 1. Literals without primaryKeys
 * 2. Class Models without primaryKeys
 * 3. Literals with primaryKeys
 * 4. Class Models with primaryKeys
 */
const testSetups: TestSetup[] = [
  {
    name: "Object literal (NO primaryKey)",
    schema: [PlaylistSchemaNoId, SongSchemaNoId],
    testData(realm: Realm) {
      realm.write(() => {
        // Shared songs
        const s1 = realm.create<ISongNoId>(SongSchemaNoId.name, {
          artist: "Shared artist name 1",
          title: "Shared title name 1",
        });
        const s2 = realm.create<ISongNoId>(SongSchemaNoId.name, {
          artist: "Shared artist name 2",
          title: "Shared title name 2",
        });
        const s3 = realm.create<ISongNoId>(SongSchemaNoId.name, {
          artist: "Shared artist name 3",
          title: "Shared title name 3",
        });

        // Playlists
        const p1 = realm.create<IPlaylistNoId>(PlaylistSchemaNoId.name, {
          title: "Playlist 1",
          songs: [
            s1,
            s2,
            s3,
            {
              artist: "Unique artist 1",
              title: "Unique title 1",
            },
            {
              artist: "Unique artist 2",
              title: "Unique title 2",
            },
          ],
        });
        const p2 = realm.create<IPlaylistNoId>(PlaylistSchemaNoId.name, {
          title: "Playlist 2",
          songs: [
            {
              artist: "Unique artist 3",
              title: "Unique title 3",
            },
            {
              artist: "Unique artist 4",
              title: "Unique title 4",
            },
            s3,
          ],
          related: [p1],
        });
        const p3 = realm.create<IPlaylistNoId>(PlaylistSchemaNoId.name, {
          title: "Playlist 3",
          songs: [
            s1,
            {
              artist: "Unique artist 5",
              title: "Unique title 5",
            },
            {
              artist: "Unique artist 6",
              title: "Unique title 6",
            },
            s2,
          ],
          related: [p1, p2],
        });

        // ensure circular references for p1 (ensure p1 reference self fist)
        p1.related.push(p1, p2, p3); // test self reference
      });

      return circularCollectionResult;
    },
  },
  {
    name: "Class model (NO primaryKey)",
    schema: [PlaylistNoId, SongNoId],
    testData(realm: Realm) {
      realm.write(() => {
        // Shared songs
        const s1 = realm.create(SongNoId, {
          artist: "Shared artist name 1",
          title: "Shared title name 1",
        });
        const s2 = realm.create(SongNoId, {
          artist: "Shared artist name 2",
          title: "Shared title name 2",
        });
        const s3 = realm.create(SongNoId, {
          artist: "Shared artist name 3",
          title: "Shared title name 3",
        });

        // Playlists
        const p1 = realm.create(PlaylistNoId, {
          title: "Playlist 1",
          songs: [
            s1,
            s2,
            s3,
            { artist: "Unique artist 1", title: "Unique title 1" },
            { artist: "Unique artist 2", title: "Unique title 2" },
          ],
        });
        const p2 = realm.create(PlaylistNoId, {
          title: "Playlist 2",
          songs: [
            { artist: "Unique artist 3", title: "Unique title 3" },
            { artist: "Unique artist 4", title: "Unique title 4" },
            s3,
          ],
          related: [p1],
        });
        const p3 = realm.create(PlaylistNoId, {
          title: "Playlist 3",
          songs: [
            s1,
            { artist: "Unique artist 5", title: "Unique title 5" },
            { artist: "Unique artist 6", title: "Unique title 6" },
            s2,
          ],
          related: [p1, p2],
        });

        // ensure circular references for p1 (ensure p1 reference self fist)
        p1.related.push(p1, p2, p3); // test self reference
      });

      return circularCollectionResult;
    },
  },
  {
    name: "Object literal (Int primaryKey)",
    schema: [PlaylistSchemaWithId, SongSchemaWithId],
    testData(realm: Realm) {
      realm.write(() => {
        // Shared songs
        const s1 = realm.create<ISongWithId>(SongSchemaWithId.name, {
          _id: 1,
          artist: "Shared artist name 1",
          title: "Shared title name 1",
        });
        const s2 = realm.create<ISongWithId>(SongSchemaWithId.name, {
          _id: 2,
          artist: "Shared artist name 2",
          title: "Shared title name 2",
        });
        const s3 = realm.create<ISongWithId>(SongSchemaWithId.name, {
          _id: 3,
          artist: "Shared artist name 3",
          title: "Shared title name 3",
        });

        // Playlists
        const p1 = realm.create<IPlaylistWithId>(PlaylistSchemaWithId.name, {
          _id: 1,
          title: "Playlist 1",
          songs: [
            s1,
            s2,
            s3,
            {
              _id: 4,
              artist: "Unique artist 1",
              title: "Unique title 1",
            },
            {
              _id: 5,
              artist: "Unique artist 2",
              title: "Unique title 2",
            },
          ],
        });
        const p2 = realm.create<IPlaylistWithId>(PlaylistSchemaWithId.name, {
          _id: 2,
          title: "Playlist 2",
          songs: [
            {
              _id: 6,
              artist: "Unique artist 3",
              title: "Unique title 3",
            },
            {
              _id: 7,
              artist: "Unique artist 4",
              title: "Unique title 4",
            },
            s3,
          ],
          related: [p1],
        });
        const p3 = realm.create<IPlaylistWithId>(PlaylistSchemaWithId.name, {
          _id: 3,
          title: "Playlist 3",
          songs: [
            s1,
            {
              _id: 8,
              artist: "Unique artist 5",
              title: "Unique title 5",
            },
            {
              _id: 9,
              artist: "Unique artist 6",
              title: "Unique title 6",
            },
            s2,
          ],
          related: [p1, p2],
        });

        // ensure circular references for p1 (ensure p1 reference self fist)
        p1.related.push(p1, p2, p3); // test self reference
      });

      return circularCollectionResultWithIds;
    },
  },
  {
    name: "Class model (Int primaryKey)",
    schema: [PlaylistWithId, SongWithId],
    testData(realm: Realm) {
      realm.write(() => {
        // Shared songs
        const s1 = realm.create(SongWithId, {
          _id: 1,
          artist: "Shared artist name 1",
          title: "Shared title name 1",
        });
        const s2 = realm.create(SongWithId, {
          _id: 2,
          artist: "Shared artist name 2",
          title: "Shared title name 2",
        });
        const s3 = realm.create(SongWithId, {
          _id: 3,
          artist: "Shared artist name 3",
          title: "Shared title name 3",
        });

        // Playlists
        const p1 = realm.create(PlaylistWithId, {
          _id: 1,
          title: "Playlist 1",
          songs: [
            s1,
            s2,
            s3,
            {
              _id: 4,
              artist: "Unique artist 1",
              title: "Unique title 1",
            },
            {
              _id: 5,
              artist: "Unique artist 2",
              title: "Unique title 2",
            },
          ],
        });
        const p2 = realm.create(PlaylistWithId, {
          _id: 2,
          title: "Playlist 2",
          songs: [
            {
              _id: 6,
              artist: "Unique artist 3",
              title: "Unique title 3",
            },
            {
              _id: 7,
              artist: "Unique artist 4",
              title: "Unique title 4",
            },
            s3,
          ],
          related: [p1],
        });
        const p3 = realm.create(PlaylistWithId, {
          _id: 3,
          title: "Playlist 3",
          songs: [
            s1,
            {
              _id: 8,
              artist: "Unique artist 5",
              title: "Unique title 5",
            },
            {
              _id: 9,
              artist: "Unique artist 6",
              title: "Unique title 6",
            },
            s2,
          ],
          related: [p1, p2],
        });

        // ensure circular references for p1 (ensure p1 reference self fist)
        p1.related.push(p1, p2, p3); // test self reference
      });

      return circularCollectionResultWithIds;
    },
  },
];

const cacheIdTestSetups: ICacheIdTestSetup[] = [
  {
    type: "int",
    schemaName: "IntIdTest",
    testId: 1337,
    expectedResult: "IntIdTest#1337",
  },
  {
    type: "string",
    schemaName: "StringIdTest",
    testId: "~!@#$%^&*()_+=-,./<>? 0123456789 ABCDEFGHIJKLMNOPQRSTUVWXYZÆØÅ abcdefghijklmnopqrstuvwxyzæøå",
    expectedResult:
      "StringIdTest#~!@#$%^&*()_+=-,./<>? 0123456789 ABCDEFGHIJKLMNOPQRSTUVWXYZÆØÅ abcdefghijklmnopqrstuvwxyzæøå",
  },
  {
    type: "objectId",
    schemaName: "ObjectIdTest",
    testId: new Realm.BSON.ObjectId("5f99418846da9c45005f50bf"),
    expectedResult: "ObjectIdTest#5f99418846da9c45005f50bf",
  },
];

describe("JSON serialization", () => {
  for (const { type, schemaName, testId, expectedResult } of cacheIdTestSetups) {
    describe(`Internal cache id check for type ${type}`, () => {
      openRealmBeforeEach({
        inMemory: true,
        schema: [
          {
            name: schemaName,
            primaryKey: "_id",
            properties: {
              _id: type,
              title: "string",
            },
          },
        ],
      });

      it(`generates correct cache id for primaryKey type: ${type}`, function (this: RealmContext) {
        this.realm.write(() => {
          this.realm.create(schemaName, {
            _id: testId,
            title: `Cache id should be: ${expectedResult}`,
          });
        });

        const testSubject = this.realm.objectForPrimaryKey(schemaName, testId as string);
        const json = JSON.stringify(testSubject, Realm.JsonSerializationReplacer);
        const parsed = JSON.parse(json);

        expect(parsed.$refId).equals(expectedResult);
      });
    });
  }

  type TestContext = { predefinedStructure: any; playlists: Realm.Results<Realm.Object> } & RealmContext;

  for (const { name, schema, testData } of testSetups) {
    describe(`Repeated test for "${name}":`, () => {
      openRealmBeforeEach({
        inMemory: true,
        schema,
      });

      beforeEach(function (this: RealmContext) {
        this.predefinedStructure = testData(this.realm);
        this.playlists = this.realm.objects(PlaylistSchemaNoId.name).sorted("title");
      });

      describe("Realm.Object", () => {
        it("extends Realm.Object", function (this: TestContext) {
          // Check that entries in the result set extends Realm.Object.
          expect(this.playlists[0]).instanceOf(Realm.Object);
        });

        it("implements toJSON", function (this: TestContext) {
          // Check that fist Playlist has toJSON implemented.
          expect(typeof this.playlists[0].toJSON).equals("function");
        });

        it("toJSON returns a circular structure", function (this: TestContext) {
          const serializable = this.playlists[0].toJSON();

          // Check that no props are functions on the serializable object.
          expect(Object.values(serializable).some((val) => typeof val === "function")).equals(false);

          // Check that linked list is not a Realm entity.
          expect(serializable.related).not.instanceOf(Realm.Collection);
          // But is a plain Array
          expect(Array.isArray(serializable.related)).equals(true);

          // Check that the serializable object is the same as the first related object.
          // (this check only makes sense because of our structure)
          expect(serializable).equals(serializable.related[0]);
        });

        it("throws correct error on serialization", function (this: TestContext) {
          // Check that we get a circular structure error.
          // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Cyclic_object_value
          expect(() => JSON.stringify(this.playlists[0])).throws(TypeError, /circular|cyclic/i);
        });

        it("serializes to expected output using Realm.JsonSerializationReplacer", function (this: TestContext) {
          const json = JSON.stringify(this.playlists[0], Realm.JsonSerializationReplacer);
          const generated = JSON.parse(json);

          // Check that we get the expected structure.
          // (parsing back to an object & using deep equals, as we can't rely on property order)
          expect(generated).deep.equals(this.predefinedStructure[0]);
        });
      });

      describe("Realm.Results", () => {
        it("extends Realm.Collection", function (this: TestContext) {
          // Check that the result set extends Realm.Collection.
          expect(this.playlists).instanceOf(Realm.Collection);
        });

        it("implements toJSON", function (this: TestContext) {
          expect(typeof this.playlists.toJSON).equals("function");
        });

        it("toJSON returns a circular structure", function (this: TestContext) {
          const serializable = this.playlists.toJSON();

          // Check that the serializable object is not a Realm entity.
          expect(serializable).not.instanceOf(Realm.Collection);
          // But is a plain Array
          expect(Array.isArray(serializable)).equals(true);

          // Check that the serializable object is not a Realm entity.
          expect(serializable).not.instanceOf(Realm.Collection);
          // But is a plain Array
          expect(Array.isArray(serializable)).equals(true);

          // Check that linked list is not a Realm entity.
          expect(serializable[0].related).not.instanceOf(Realm.Collection);
          // But is a plain Array
          expect(Array.isArray(serializable[0].related)).equals(true);

          // Check that the serializable object is the same as the first related object.
          // (this check only makes sense because of our structure)
          expect(serializable[0]).equals(serializable[0].related[0]);
        });

        it("throws correct error on serialization", function (this: TestContext) {
          // Check that we get a circular structure error.
          // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Cyclic_object_value
          expect(() => JSON.stringify(this.playlists)).throws(TypeError, /circular|cyclic/i);
        });

        it("serializes to expected output using Realm.JsonSerializationReplacer", function (this: TestContext) {
          const json = JSON.stringify(this.playlists, Realm.JsonSerializationReplacer);
          const generated = JSON.parse(json);

          // Check that we get the expected structure.
          // (parsing back to an object & using deep equals, as we can't rely on property order)
          expect(generated).deep.equals(this.predefinedStructure);
        });
      });
    });
  }
});
