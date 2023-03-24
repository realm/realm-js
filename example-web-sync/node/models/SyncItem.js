export const SyncItemSchema = {
  name: "SyncItem",
  primaryKey: "_id",
  properties: {
    _id: "objectId",
    _partition: "string",
    fieldToUpdate: "double",
  },
};
