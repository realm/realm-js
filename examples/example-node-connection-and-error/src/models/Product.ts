import { BSON, ObjectSchema } from "realm";

// Current information and inventory about a type of product in a particular store.
// (This is simplified to refer to a complete product (e.g. a sandwich, rather than
// e.g. bread, cheese, lettuce, etc.)
export const ProductSchema: ObjectSchema = {
  name: "Product",
  primaryKey: "_id",
  properties: {
    _id: "objectId",
    storeId: { type: "objectId", indexed: true },
    name: "string",
    price: "double",
    numInStock: "int",
  },
};

export type Product = {
  _id: BSON.ObjectId;
  storeId: BSON.ObjectId;
  name: string;
  price: number;
  numInStock: number;
};
