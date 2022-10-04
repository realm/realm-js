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

import { IPlaylist, ISong, PlaylistSchema, SongSchema } from "../schemas/playlist-with-songs";
import circularCollectionResult from "../structures/circular-collection-result.json";
import { openRealmBeforeEach } from "../hooks";

type TestSetup = {
  name: string;
  schema: Realm.ObjectSchema[];
  testData: (realm: Realm) => unknown;
};

/**
 * Create test data (TestSetups) in 2
 * 1. Objects that have list fields with circular references of other objects.
 * 2. Object with a dictionary struct
 */
const testSetups: TestSetup[] = [
  {
    name: "Object literals with list fields",
    schema: [PlaylistSchema, SongSchema],
    testData(realm: Realm) {
      realm.write(() => {
        // Shared songs
        const s1 = realm.create<ISong>(SongSchema.name, {
          artist: "Shared artist name 1",
          title: "Shared title name 1",
        });
        const s2 = realm.create<ISong>(SongSchema.name, {
          artist: "Shared artist name 2",
          title: "Shared title name 2",
        });
        const s3 = realm.create<ISong>(SongSchema.name, {
          artist: "Shared artist name 3",
          title: "Shared title name 3",
        });

        // Playlists
        const p1 = realm.create<IPlaylist>(PlaylistSchema.name, {
          title: "Playlist 1",
          songs: [s1, s2, s3],
          related: [],
        });
        const p2 = realm.create<IPlaylist>(PlaylistSchema.name, {
          title: "Playlist 2",
          songs: [s3],
          related: [p1],
        });
        const p3 = realm.create<IPlaylist>(PlaylistSchema.name, {
          title: "Playlist 3",
          songs: [s1, s2],
          related: [p1, p2],
        });

        // ensure circular references for p1 (ensure p1 reference self fist)
        p1.related.push(p1, p2, p3); // test self reference
      });

      return circularCollectionResult;
    },
  },
  {
    name: "Objects with dictionary fields",
    schema: [
      {
        name: "Item",
        properties: { dict: "{}" },
      },
    ],
    testData(realm: Realm) {
      // realm.write(() => {});
      return;
    },
  },
];

describe("toJSON functionality", () => {
  type TestContext = { predefinedStructure: any; playlists: Realm.Results<Realm.Object> } & RealmContext;

  for (const { name, schema, testData } of testSetups) {
    describe(`Repeated test for "${name}":`, () => {
      openRealmBeforeEach({
        inMemory: true,
        schema,
      });

      beforeEach(function (this: RealmContext) {
        this.predefinedStructure = testData(this.realm);
        this.playlists = this.realm.objects(PlaylistSchema.name).sorted("title");
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
          // @ts-expect-error We know serialzable[0].related is a list.
          expect(serializable).equals(serializable.related[0]);
        });

        it("throws correct error on serialization", function (this: TestContext) {
          // Check that we get a circular structure error.
          // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Cyclic_object_value
          expect(() => JSON.stringify(this.playlists[0])).throws(TypeError, /circular|cyclic/i);
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
          // @ts-expect-error We know serialzable[0].related is a list.
          expect(serializable[0].related).equals(serialzable[0].related[0]);
        });

        it("throws correct error on serialization", function (this: TestContext) {
          // Check that we get a circular structure error.
          // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Cyclic_object_value
          expect(() => JSON.stringify(this.playlists)).throws(TypeError, /circular|cyclic/i);
        });
      });
    });
  }

  describe("toJSON edge case handling", function () {
    interface EdgeCaseSchema {
      maybeNull: null;
    }

    const EdgeCaseSchema = {
      name: "EdgeCase",
      properties: {
        maybeNull: "string?",
      },
    };

    openRealmBeforeEach({
      inMemory: true,
      schema: [EdgeCaseSchema],
    });

    it("handles null values", function (this: RealmContext) {
      const object = this.realm.write(() => {
        return this.realm.create<EdgeCaseSchema>(EdgeCaseSchema.name, {
          maybeNull: null,
        });
      });

      expect(object.toJSON()).deep.equals({ maybeNull: null });
    });
  });
});
