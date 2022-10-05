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
// import { stringify, parse } from "@ungap/structured-clone/json";

import { openRealmBefore, openRealmBeforeEach } from "../hooks";

const PlaylistSchema: Realm.ObjectSchema = {
  name: "Playlist",
  properties: {
    title: "string",
    songs: "Song[]",
    related: "Playlist[]",
  },
};

const SongSchema: Realm.ObjectSchema = {
  name: "Song",
  properties: {
    artist: "string",
    title: "string",
  },
};

interface ISong {
  artist: string;
  title: string;
}

interface IPlaylist {
  title: string;
  related: Realm.List<IPlaylist>;
  songs: Realm.List<ISong>;
}

const BirthdaysSchema: Realm.ObjectSchema = {
  name: "Birthdays",
  properties: {
    dict: "{}",
  },
};

interface IBirthdays {
  dict: Record<any, any>;
}

describe("toJSON functionality", () => {
  type TestContext = {
    playlists: Realm.Results<Realm.Object>;
    birthdays: Realm.Object<IBirthdays>;
    p1Serialized: Record<string, any>;
    resultsSerialized: Record<string, any>;
    birthdaysSerialized: Record<string, any>;
  } & RealmContext;
  describe("with Object, Results, and Dictionary", () => {
    openRealmBefore({
      inMemory: true,
      schema: [PlaylistSchema, SongSchema, BirthdaysSchema],
    });

    before(function (this: RealmContext) {
      this.realm.write(() => {
        // Playlists
        const p1 = this.realm.create<IPlaylist>(PlaylistSchema.name, {
          title: "Playlist 1",
        });
        const p2 = this.realm.create<IPlaylist>(PlaylistSchema.name, {
          title: "Playlist 2",
          related: [p1],
        });
        // ensure circular references for p1 (ensure p1 references itself)
        p1.related.push(p1, p2);

        // Create expected serialized p1 and p2 objects.
        this.p1Serialized = {
          title: "Playlist 1",
          songs: [],
        };
        const p2Serialized = {
          title: "Playlist 2",
          songs: [],
          related: [this.p1Serialized],
        };
        this.p1Serialized.related = [this.p1Serialized, p2Serialized];

        // Create expected serialized Realm Results object.
        this.resultsSerialized = this.p1Serialized.related;

        this.birthdaysSerialized = {
          dict: {
            Bob: "August",
            Tom: "January",
          },
        };
        // Dictionary object test
        this.birthdays = this.realm.create<IBirthdays>("Birthdays", this.birthdaysSerialized);

        // See #4980. Setting dictionary to other dictionaries (or itself)
        // is currently error-prone.
        // this.birthdays.dict.parent = this.birthdays.dict;

        this.birthdays.dict.grandparent = this.birthdays;
        this.birthdaysSerialized.dict.grandparent = this.birthdaysSerialzied;
        this.playlists = this.realm.objects(PlaylistSchema.name).sorted("title");
      });
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

        // Check that the object is not a Realm entity
        expect(serializable).not.instanceOf(Realm.Object);
        // But is a plain object
        expect(Object.getPrototypeOf(serializable)).equals(Object.prototype);

        // Check that linked list is not a Realm entity.
        expect(serializable.related).not.instanceOf(Realm.Collection);
        // But is a plain Array
        expect(Array.isArray(serializable.related)).equals(true);
        // Check that the serializable object is the same as the first related object.
        // (this check only makes sense because of our structure)
        expect(serializable).equals(serializable.related[0]);
      });

      it("toJSON matches expected structure", function (this: TestContext) {
        const serializable = this.playlists[0].toJSON();
        // Ensure the object is deeply equal to the expected serialized object.
        expect(serializable).deep.equals(this.p1Serialized);
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
        expect(serializable[0]).equals(serializable[0].related[0]);
      });

      it("toJSON matches expected structure", function (this: TestContext) {
        const serializable = this.playlists.toJSON();
        // Ensure the array is deeply equal to the expected serialized array.
        expect(serializable).deep.equals(this.resultsSerialized);
      });

      it("throws correct error on serialization", function (this: TestContext) {
        // Check that we get a circular structure error.
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Cyclic_object_value
        expect(() => JSON.stringify(this.playlists)).throws(TypeError, /circular|cyclic/i);
      });
    });
    describe("Realm.Dictionary", () => {
      it("extends Realm.Dictionary", function (this: TestContext) {
        // Check that the dict field extends Realm.Collection.
        expect(this.birthdays.dict).instanceOf(Realm.Dictionary);
      });

      it("implements toJSON", function (this: TestContext) {
        expect(typeof this.birthdays.dict.toJSON).equals("function");
      });

      it("toJSON returns a circular structure", function (this: TestContext) {
        const serializable = this.birthdays.toJSON();

        // Check that the serializable object and its dict field are not Realm entities.
        expect(serializable).not.instanceOf(Realm.Object);
        expect(serializable.dict).not.instanceOf(Realm.Dictionary);
        // And the entire object is a plain object
        expect(Object.getPrototypeOf(serializable)).equals(Object.prototype);
        expect(Object.getPrototypeOf(serializable.dict)).equals(Object.prototype);

        // Check that the serializable object is the same as the first related object.
        console.log(serializable)
        expect(serializable).equals(serializable.dict.grandparent);
      });

      it("throws correct error on serialization", function (this: TestContext) {
        // Check that we get a circular structure error.
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Cyclic_object_value
        expect(() => JSON.stringify(this.birthdays)).throws(TypeError, /circular|cyclic/i);
      });

      it("but works with a circular JSON serialization frameworks", function (this: TestContext) {
        // console.log(stringify({ any: "serializable" }));
      });
    });
  });

  describe("with edge cases", function () {
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
