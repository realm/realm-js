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
import Realm, { DefaultObject } from "realm";
import { stringify, parse } from "@ungap/structured-clone/json";

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
    dict: "{}",
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
  subject: Realm.Object<any> | Realm.Results;
  // Type of the Realm instance
  type: typeof Realm.Object | typeof Realm.Results | typeof Realm.Dictionary;
  // Expected serialized plain object result
  serialized: DefaultObject;
}

const commonTests: Record<string, TestSetup> = {
  //@ts-expect-error subject and serialized are set before tests run.
  Object: { type: Realm.Object },
  //@ts-expect-error subject and serialized are set before tests run.
  Results: { type: Realm.Results },
  //@ts-expect-error subject and serialized are set before tests run.
  Dictionary: { type: Realm.Dictionary },
};

describe("toJSON functionality", () => {
  type TestContext = {
    playlists: Realm.Results<Realm.Object> & IPlaylist[];
    birthdays: Realm.Object<IBirthdays> & IBirthdays;
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
        songs: [],
        related: [],
      };

      const p2Serialized = {
        title: "Playlist 2",
        songs: [],
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

      // Use p1 to test Object implementations
      commonTests.Object.subject = p1;
      commonTests.Object.serialized = p1Serialized;

      // Use playlist to test Result implementations
      this.playlists = this.realm.objects(PlaylistSchema.name).sorted("title");
      this.playlistsSerialized = p1Serialized.related;
      commonTests.Results.subject = this.playlists;
      commonTests.Results.serialized = this.playlistsSerialized;

      this.birthdaysSerialized = {
        dict: {
          Bob: "August",
          Tom: "January",
        },
      };
      // Dictionary object test
      this.birthdays = this.realm.create<IBirthdays>("Birthdays", this.birthdaysSerialized);

      // See #4980.
      // Setting dictionary to other dictionaries (or itself) is currently error-prone.
      // this.birthdays.dict.parent = this.birthdays.dict;

      this.birthdays.dict.grandparent = this.birthdays;
      this.birthdaysSerialized.dict.grandparent = this.birthdaysSerialized;

      commonTests.Dictionary.subject = this.birthdays.dict;
      commonTests.Dictionary.serialized = this.birthdaysSerialized.dict;
    });
  });
  describe(`common tests`, () => {
    for (const name in commonTests) {
      const test = commonTests[name];
      describe(`with Realm.${name}`, () => {
        it("implements toJSON", function (this: TestContext) {
          expect(test.subject).instanceOf(test.type);

          expect(typeof test.subject.toJSON).equals("function");
        });
        it("toJSON returns a plain object or array", function (this: TestContext) {
          const serializable = test.subject.toJSON();

          // Check that serializable object is not a Realm entity.
          expect(serializable).not.instanceOf(test.type);
          // Check that no props are functions on the serializable object.
          expect(Object.values(serializable).some((val) => typeof val === "function")).equals(false);

          if (test.type == Realm.Results) expect(Array.isArray(serializable)).equals(true);
          else expect(Object.getPrototypeOf(serializable)).equals(Object.prototype);
        });
        it("toJSON matches expected structure", function (this: TestContext) {
          const serializable = test.subject.toJSON();
          // Ensure the object is deeply equal to the expected serialized object.
          expect(serializable).deep.equals(test.serialized);
        });
        it("throws correct error on serialization", function (this: TestContext) {
          const serializable = test.subject.toJSON();
          // Check that we get a circular structure error.
          // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Cyclic_object_value
          expect(() => JSON.stringify(serializable)).throws(TypeError, /circular|cyclic/i);
        });
        it("but works with circular JSON serialization frameworks", function (this: TestContext) {
          expect(parse(stringify(this.birthdays))).deep.equals(this.birthdaysSerialized);
        });
      });
    }
  });

  describe("with edge cases", function () {
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
      // @ts-expect-error We know this is a list
      expect(serializable).equals(serializable.dict.grandparent);
    });
  });
});
