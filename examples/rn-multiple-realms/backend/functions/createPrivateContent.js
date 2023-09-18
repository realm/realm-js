/* eslint-disable */

/**
 * Creates a `PrivateContent` entry specific to a user.
 *
 * To see more examples of what you can do with functions, see:
 * https://www.mongodb.com/docs/atlas/app-services/functions/
 */
exports = async function createPrivateContent({ user }) {
  // To find the name of the MongoDB service to use, see "Linked Data Sources" tab.
  const serviceName = "mongodb-atlas";
  const databaseName = "sample_mflix";
  const collectionName = "PrivateContent";

  // Get the collection from the context. Atlas Functions have access to a global context object
  // that contains metadata for the incoming requests. To read more about context, see:
  // https://www.mongodb.com/docs/atlas/app-services/functions/context/#std-label-function-context
  const collection = context
    .services
    .get(serviceName)
    .db(databaseName)
    .collection(collectionName);

  const newPrivateContentDoc = {
    _id: new BSON.ObjectId(user.id),
    userId : user.id,
    myList: [],
  };

  try {
    return await collection.insertOne(newPrivateContentDoc);
  } catch(err) {
    console.error("Error while executing `createPrivateContent()`:", err.message);
  }
};
