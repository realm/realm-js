/* eslint-disable */

/**
 * Toggle between two stores. This is run as the system user, since it will need to create
 * a second store if one does not exist. The userId is provided as a string.
 */
exports = async function switchStore() {
  const userId = context.user.id;
  const customUserDataCollection = context.services.get("mongodb-atlas").db("StoreDemo").collection("Users");

  try {
    const userDoc = await customUserDataCollection.findOne({userId});
    const store = await getOrCreateStore(userDoc.storeId);
    await customUserDataCollection.updateOne({
      userId,
    },
		{$set: {
			storeId:store._id,
		}});
  } catch (e) {
    console.error(`Failed to create custom user data document for user:${userId}`);
    throw e;
  }
};

// Returns a different store than the current `userStore`.
// This will help toggle between stores.  It will create a second store
// if one does not already exist.
async function getOrCreateStore(userStoreId) {
    const stores = await context.functions.execute("getAllStores");
    if (userStoreId.toString() === stores[0]?._id.toString()) {
      if (!stores[1]) {
        const store = await context.functions.execute("createNewStore");
        return store;
      }
      return stores[1];
    }

    return stores[0] || await context.functions.execute("createNewStore");
}
