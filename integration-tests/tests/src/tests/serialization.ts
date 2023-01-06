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
import { Realm } from "realm";

type DefaultObject = Record<string, unknown>;

import { openRealmBefore } from "../hooks";

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
    dict: "mixed{}",
  },
};

interface IBirthdays {
  dict: Record<any, any>;
}

interface EdgeCaseSchema {
  maybeNull: null;
}

const EdgeCaseSchema = {
  name: "EdgeCase",
  properties: {
    maybeNull: "string?",
  },
};

interface TestSetup {
  // Realm instance being tested
  subject: Realm.Object | Realm.Results<Realm.Object>;
  // Type of the Realm instance
  type: typeof Realm.Object | typeof Realm.Results | typeof Realm.Dictionary;
  // Expected serialized plain object result
  serialized: DefaultObject;
}

//  Describe common test types that will be run,
//  must match this.commonTests that are defined in before().
const commonTestsTypes = ["Object", "Results", "Dictionary"];

describe("toJSON functionality", () => {
  type TestContext = {
    commonTests: Record<string, TestSetup>;
    playlists: Realm.Results<Realm.Object> & IPlaylist[];
    birthdays: Realm.Object & IBirthdays;
    p1Serialized: DefaultObject;
    resultsSerialized: DefaultObject;
    birthdaysSerialized: DefaultObject;
  } & RealmContext;
  openRealmBefore({
    inMemory: true,
    schema: [PlaylistSchema, SongSchema, BirthdaysSchema, EdgeCaseSchema],
  });

  before(function (this: RealmContext) {
    this.realm.write(() => {
      // Create expected serialized p1 and p2 objects.
      const p1Serialized = {
        title: "Playlist 1",
        songs: [
          { title: "Song", artist: "First" },
          { title: "Another", artist: "Second" },
        ],
        related: [],
      };

      const p2Serialized = {
        title: "Playlist 2",
        songs: [{ title: "Title", artist: "Third" }],
        related: [],
      };
      // Playlists
      const p1 = this.realm.create<IPlaylist>(PlaylistSchema.name, p1Serialized);
      const p2 = this.realm.create<IPlaylist>(PlaylistSchema.name, p2Serialized);
      // ensure circular references for p1 (ensure p1 references itself)
      p1.related.push(p1, p2);
      //@ts-expect-error Adding to related field to match
      p1Serialized.related.push(p1Serialized, p2Serialized);

      p2.related.push(p1);
      //@ts-expect-error Adding to related field to match
      p2Serialized.related.push(p1Serialized);

      // Use playlist to test Result implementations
      this.playlists = this.realm.objects(PlaylistSchema.name).sorted("title");
      this.playlistsSerialized = p1Serialized.related;

      this.birthdaysSerialized = {
        dict: {
          Bob: "August",
          Tom: "January",
        },
      };
      // Dictionary object test
      this.birthdays = this.realm.create<IBirthdays>("Birthdays", this.birthdaysSerialized);

      this.birthdays.dict.grandparent = this.birthdays;
      this.birthdaysSerialized.dict.grandparent = this.birthdaysSerialized;

      // Define the structures for the common test suite.
      this.commonTests = {
        Object: {
          type: Realm.Object,
          subject: p1,
          serialized: p1Serialized,
        },
        Results: {
          type: Realm.Results,
          subject: this.playlists,
          serialized: this.playlistsSerialized,
        },
        Dictionary: {
          type: Realm.Dictionary,
          subject: this.birthdays.dict,
          serialized: this.birthdaysSerialized.dict,
        },
      };
    });
  });
  describe(`common tests`, () => {
    for (const name of commonTestsTypes) {
      describe(`with Realm.${name}`, () => {
        it("implements toJSON", function (this: TestContext) {
          const test = this.commonTests[name];
          expect(test.subject).instanceOf(test.type);

          expect(typeof test.subject.toJSON).equals("function");
        });
        it("toJSON returns a plain object or array", function (this: TestContext) {
          const test = this.commonTests[name];
          const serializable = test.subject.toJSON();

          // Check that serializable object is not a Realm entity.
          expect(serializable).not.instanceOf(test.type);
          // Check that no props are functions on the serializable object.
          expect(Object.values(serializable).some((val) => typeof val === "function")).equals(false);

          if (test.type == Realm.Results) expect(Array.isArray(serializable)).equals(true);
          else expect(Object.getPrototypeOf(serializable)).equals(Object.prototype);
        });
        it("toJSON matches expected structure", function (this: TestContext) {
          const test = this.commonTests[name];
          const serializable = test.subject.toJSON();
          // Ensure the object is deeply equal to the expected serialized object.
          expect(serializable).deep.equals(test.serialized);
        });
        it("throws correct error on serialization", function (this: TestContext) {
          const test = this.commonTests[name];
          const serializable = test.subject.toJSON();
          // Check that we get a circular structure error.
          // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Cyclic_object_value
          expect(() => JSON.stringify(serializable)).throws(TypeError, /circular|cyclic/i);
        });
      });
    }
  });

  describe("edge cases", function () {
    it("handles null values", function (this: RealmContext) {
      const object = this.realm.write(() => {
        return this.realm.create<EdgeCaseSchema>(EdgeCaseSchema.name, {
          maybeNull: null,
        });
      });

      expect(object.toJSON()).deep.equals({ maybeNull: null });
    });
    it("handles a dictionary field referencing its parent", function (this: TestContext) {
      const serializable = this.birthdays.toJSON();
      // Check that the serializable object is the same as the first related object.
      // @ts-expect-error We know the field is a dict.
      expect(serializable).equals(serializable.dict.grandparent);
      // And matches expected serialized object.
      expect(serializable).deep.equals(this.birthdaysSerialized);
    });
  });
});
