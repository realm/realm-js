import Realm, { BSON, ObjectSchema } from "realm";

import { Kiosk } from "./Kiosk";

export const StoreSchema: ObjectSchema = {
  name: "Store",
  primaryKey: "_id",
  properties: {
    _id: "objectId",
    kiosks: "Kiosk[]",
  },
};

export type Store = {
  _id: BSON.ObjectId;
  kiosks: Realm.List<Kiosk>;
};
