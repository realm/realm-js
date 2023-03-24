import Realm, { BSON } from "realm";

export class SyncItem extends Realm.Object {
  constructor(
    realm: Realm,
    public _id: BSON.ObjectId,
    public _partition: string,
    public fieldToUpdate: number
  ) {
    super(realm, { _id, _partition, fieldToUpdate });
  }

  static schema = {
    name: "SyncItem",
    primaryKey: "_id",
    properties: {
      _id: "objectId",
      _partition: "string",
      fieldToUpdate: "double",
    },
  };
}
