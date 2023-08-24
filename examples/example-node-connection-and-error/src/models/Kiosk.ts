import Realm, { BSON, ObjectSchema } from "realm";

import { Product } from "./Product";

export const KioskSchema: ObjectSchema = {
  name: "Kiosk",
  primaryKey: "_id",
  properties: {
    _id: "objectId",
    storeId: { type: "objectId", indexed: true },
    products: "Product[]",
  },
};

export type Kiosk = {
  _id: BSON.ObjectId;
  storeId: BSON.ObjectId;
  products: Realm.List<Product>;
};
