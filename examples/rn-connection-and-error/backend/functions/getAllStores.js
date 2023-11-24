/* eslint-disable */

/**
 * Returns an array of all store documents.
 *
 * @note
 * This is defined as a separate function in order to configure it to be run as the
 * system user rather than an application user. This is necessary due to how we have
 * configured the permissions, since an application user can only read one specific
 * `Store` document (the one matching the `storeId` field in the custom user data
 * (`Users`) document) at any given time.
 */
exports = async function(){
  const storeCollection = context.services.get("mongodb-atlas").db("StoreDemo").collection("Store");

  return await storeCollection.find().toArray();
};
