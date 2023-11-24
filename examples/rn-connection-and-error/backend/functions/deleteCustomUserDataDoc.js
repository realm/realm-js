/* eslint-disable */

/**
 * Deletes a custom user data (`Users`) document.
 */
exports = async function deleteCustomUserDataDoc({ user }) {
  // To find the name of the MongoDB service to use, see "Linked Data Sources" tab.
  const serviceName = "mongodb-atlas";
  const databaseName = "StoreDemo";
  const collectionName = "Users";

  const customUserDataCollection = context
    .services
    .get(serviceName)
    .db(databaseName)
    .collection(collectionName);

  try {
    return await customUserDataCollection.deleteOne({ userId: user.id });
  } catch(err) {
    console.error("Error while executing `deleteCustomUserDataDoc()`:", err.message);
  }
};
