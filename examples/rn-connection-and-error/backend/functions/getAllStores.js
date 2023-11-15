/* eslint-disable */

/**
 * Returns an array of all store documents.
 */
exports = async function(){
  const storeCollection = context.services.get("mongodb-atlas").db("StoreDemo").collection("Store");

  return await storeCollection.find().toArray();
};
