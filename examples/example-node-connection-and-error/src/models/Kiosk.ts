import Realm, { BSON, ObjectSchema } from "realm";

import { Product } from "./Product";

export class Kiosk extends Realm.Object {
  _id!: BSON.ObjectId;
  storeId!: BSON.ObjectId;
  products!: Realm.List<Product>;

  static schema: ObjectSchema = {
    name: "Kiosk",
    primaryKey: "_id",
    properties: {
      _id: "objectId",
      storeId: { type: "objectId", indexed: true },
      products: "Product[]",
    },
  };
}
