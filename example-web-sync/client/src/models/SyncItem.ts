import Realm, { BSON } from "realm";

export class SyncItem extends Realm.Object {
  constructor(realm: Realm, public _id: BSON.ObjectId, public _partition: string) {
    super(realm, { _id, _partition });
  }

  static schema = {
    name: "SyncItem",
    primaryKey: "_id",
    properties: {
      _id: "objectId",
      _partition: "string",
    },
  };
}
