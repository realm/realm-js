/* eslint-disable */

/**
 * Upserts custom user data to the Users collection when a user is authorized.
 * Will create a default store if one does not already exist.
 */
exports = async function setUserDefaultStoreId(user) {
  const customUserDataCollection = context.services.get("mongodb-atlas").db("StoreDemo").collection("Users");
  const storesCollection = context.services.get("mongodb-atlas").db("StoreDemo").collection("Store");

  try {
    const defaultStore = await getDefaultStore(storesCollection);

    await customUserDataCollection.updateOne(
      { userId: user.id},
      {$set:  {
      // Save the user's account ID to your configured user_id field.
      userId: user.id,
      // Group Id
      storeId: defaultStore._id
    }},
    {upsert: true}
    );
  } catch (e) {
    console.error(`Failed to create custom user data document for user:${user.id}`);
    throw e;
  }
};

async function getDefaultStore(storesCollection){
    // attempt to get the default store if it exists and create it if it doesn't
    const store = await storesCollection.findOne({});

    if (!store) {
      const store = await context.functions.execute('createNewStore')
      return store;
    }
    return store;
}
