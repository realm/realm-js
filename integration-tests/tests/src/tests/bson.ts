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
import { Decimal128, ObjectID, ObjectId, UUID } from "bson";
import { expect } from "chai";
import Realm, { BSON } from "realm";
import { openRealmBeforeEach } from "../hooks";

const Decimal128ObjectSchema = {
  name: "Decimal128Object",
  properties: {
    decimal128Col: "decimal128",
  },
};

const ObjectIdObjectSchema = {
  name: "ObjectIdObject",
  properties: {
    id: "objectId",
  },
};

const UUIDObjectSchema = {
  name: "uuid",
  properties: {
    id: "uuid",
  },
};

const UUIDPkObjectSchema = {
  name: "uuidpk",
  primaryKey: "_id",
  properties: {
    _id: "uuid",
  },
};

interface IDecimal128Object {
  decimal128Col: Decimal128;
}

interface IObjectIdObject {
  id: ObjectId;
}

interface IUUIDObject {
  id: UUID;
}

interface IUUIDPkObject {
  _id: UUID;
}

describe("BSON", () => {
  describe("export", () => {
    it("gets exported", () => {
      expect(typeof Realm.BSON).equals("object");
      expect(typeof Realm.BSON.ObjectId).equals("function");
      expect(typeof Realm.BSON.Decimal128).equals("function");
      expect(typeof Realm.BSON.Binary).equals("function");
      expect(typeof Realm.BSON.EJSON).equals("object");
    });
  });
  describe("roundtrips", () => {
    describe("decimal128", () => {
      openRealmBeforeEach({ schema: [Decimal128ObjectSchema] });
      it("can store and fetch simple numbers", function (this: RealmContext) {
        const numbers = [42, 3.1415, 6.022e23, -7, -100.2, 1.02e9];

        numbers.forEach((number) => {
          const d = Decimal128.fromString(number.toString());
          this.realm.write(() => {
            this.realm.create(Decimal128ObjectSchema.name, { decimal128Col: d });
          });
        });

        const objects = this.realm.objects<IDecimal128Object>(Decimal128ObjectSchema.name);
        expect(objects.length).equals(numbers.length);

        const d128Col = objects[0].objectSchema().properties.decimal128Col as Realm.ObjectSchemaProperty;
        expect(d128Col.type).equals("decimal128");

        for (let i = 0; i < numbers.length; i++) {
          const d128 = objects[i].decimal128Col;
          expect(d128).instanceOf(BSON.Decimal128);
          expect(d128.toString()).equals(numbers[i].toString().toUpperCase());
        }
      });
      it("can store and fetch large numbers", function (this: RealmContext) {
        // Core doesn't support numbers like 9.99e+6143 yet.
        const numbers = ["1.02e+6102", "-1.02e+6102", "1.02e-6102", /*"9.99e+6143",*/ "1e-6142"];

        numbers.forEach((number) => {
          const d = Decimal128.fromString(number);
          this.realm.write(() => {
            this.realm.create(Decimal128ObjectSchema.name, { decimal128Col: d });
          });
        });

        const objects = this.realm.objects<IDecimal128Object>(Decimal128ObjectSchema.name);
        expect(objects.length).equals(numbers.length);

        for (let i = 0; i < numbers.length; i++) {
          const d128 = objects[i]["decimal128Col"];
          expect(d128).instanceOf(BSON.Decimal128);
          expect(d128.toString()).equals(numbers[i].toString().toUpperCase());
        }
      });
    });
    describe("objectId", () => {
      openRealmBeforeEach({ schema: [ObjectIdObjectSchema] });
      it("can successfully store and retrieve objectIds", function (this: RealmContext) {
        const values = ["0000002a9a7969d24bea4cf2", "0000002a9a7969d24bea4cf3"];
        const oids: ObjectID[] = [];

        values.forEach((v) => {
          const oid = new ObjectId(v);
          this.realm.write(() => {
            this.realm.create(ObjectIdObjectSchema.name, { id: oid });
          });
          oids.push(oid);
        });

        const objects = this.realm.objects<IObjectIdObject>(ObjectIdObjectSchema.name);
        expect(objects.length).equals(values.length);

        const idCol = objects[0].objectSchema().properties.id as Realm.ObjectSchemaProperty;
        expect(idCol.type).equals("objectId");

        for (let i = 0; i < values.length; i++) {
          const oid2 = objects[i]["id"];
          expect(oid2).instanceof(BSON.ObjectId);
          expect(oids[i].equals(oid2)).to.be.true;
          expect(oid2.toHexString()).equals(oids[i].toHexString());
        }
      });
      it("can fetch timestamps from when the objectId was created", function (this: RealmContext) {
        const values = [1, 1000000000, 2000000000];
        const oids: ObjectID[] = [];

        values.forEach((v) => {
          const oid = ObjectId.createFromTime(v);
          this.realm.write(() => {
            this.realm.create(ObjectIdObjectSchema.name, { id: oid });
          });
          oids.push(oid);
        });

        const objects = this.realm.objects<IObjectIdObject>(ObjectIdObjectSchema.name);
        expect(objects.length).equals(values.length);

        for (let i = 0; i < values.length; i++) {
          const oid2 = objects[i]["id"];
          expect(oid2).instanceof(BSON.ObjectId);
          expect(oids[i].equals(oid2)).to.be.true;
          expect(oid2.toHexString()).equals(oids[i].toHexString());
          expect(oid2.getTimestamp().toISOString()).equals(oids[i].getTimestamp().toISOString());
        }
      });
    });
    describe("UUID", () => {
      openRealmBeforeEach({ schema: [UUIDObjectSchema, UUIDPkObjectSchema] });
      it("can successfully store and retrieve uuid", function (this: RealmContext) {
        // Predefined uuid checks
        const uuidStr = "af4f40c0-e833-4ab1-b026-484cdeadd782";
        const uuid = new UUID(uuidStr);
        const obj = this.realm.write(() => {
          return this.realm.create<IUUIDObject>(UUIDObjectSchema.name, { id: uuid });
        });

        expect(this.realm.objects(UUIDObjectSchema.name).length).equals(1);

        expect(obj.id).instanceof(BSON.UUID, "Roundtrip data is instance of UUID.");
        expect(uuid.equals(obj.id)).equals(true);
        expect(obj.id.toString()).equals(uuidStr, "Roundtrip string representation equals predefined input string.");
      });
      it("can retrieve object with uuid as primarykey", function (this: RealmContext) {
        const uuidStr = "188a7e3b-26d4-44ba-91e2-844c1c73a963";
        const uuid = new UUID(uuidStr);
        this.realm.write(() => {
          this.realm.create(UUIDPkObjectSchema.name, { _id: uuid });
        });
        const obj = this.realm.objectForPrimaryKey<IUUIDPkObject>(UUIDPkObjectSchema.name, uuid);
        expect(obj).to.not.be.null;
        expect(obj).to.not.be.undefined;
        expect(obj?._id).instanceof(BSON.UUID, "Objects PK is instance of UUID.");
        expect(obj?._id.toString()).equals(uuidStr, "Roundtrip string representation equals predefined input string.");
      });
    });
  });
});
