import Realm, { BSON, ObjectSchema } from "realm";

import { Kiosk } from "./Kiosk";

export class Store extends Realm.Object {
  _id!: BSON.ObjectId;
  kiosks!: Realm.List<Kiosk>;

  static schema: ObjectSchema = {
    name: "Store",
    primaryKey: "_id",
    properties: {
      _id: "objectId",
      kiosks: "Kiosk[]",
    },
  };
}
